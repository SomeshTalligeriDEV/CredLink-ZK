// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// ---------------------------------------------------------------------------
//  Interfaces
// ---------------------------------------------------------------------------

/**
 * @title ICreditScoreZK
 * @notice Interface for the CreditScoreZK contract used by the lending pool.
 */
interface ICreditScoreZK {
    function getCollateralRequired(
        address user,
        uint256 loanAmount
    ) external view returns (uint256);

    function getUserTier(
        address user
    ) external view returns (uint8 tier, uint256 collateralRatio);

    function adjustScore(address user, int256 delta) external;

    function incrementLoans(address user) external;

    function incrementRepaidLoans(address user) external;

    function getScore(address user) external view returns (uint256);

    function getUserProfile(
        address user
    )
        external
        view
        returns (
            uint256 score,
            uint8 tier,
            uint256 collateralRatio,
            uint256 totalLoans,
            uint256 repaidLoans,
            uint256 lastUpdated
        );
}

/**
 * @title ICollateralManager
 * @notice Interface for the CollateralManager contract used by the lending pool.
 */
interface ICollateralManager {
    function lockCollateral(
        uint256 loanId,
        address borrower
    ) external payable;

    function releaseCollateral(uint256 loanId, address to) external;

    function liquidateCollateral(uint256 loanId, address pool) external;

    function getCollateralValue(uint256 loanId) external view returns (uint256);

    function isUndercollateralized(
        uint256 loanId,
        uint256 loanAmount
    ) external view returns (bool);
}

// ---------------------------------------------------------------------------
//  Contract
// ---------------------------------------------------------------------------

/**
 * @title LendingPool
 * @author CredLink ZK Team
 * @notice Decentralised lending pool for BNB Chain that uses ZK-based credit
 *         scores to determine collateral requirements. Lenders deposit BNB and
 *         earn yield (tracked off-chain at 8% APY). Borrowers request loans
 *         whose collateral ratio is determined by their on-chain credit tier.
 *
 * @dev Key design decisions:
 *      - Maximum pool utilization is 80% to ensure lender liquidity.
 *      - Loan interest is a flat 2% of the principal, paid at repayment.
 *      - Successful repayment increases the borrower's credit score (+50).
 *      - Liquidation decreases the borrower's credit score (-100).
 *      - Collateral is held in the separate CollateralManager contract.
 */
contract LendingPool is AccessControl, ReentrancyGuard, Pausable {
    // -----------------------------------------------------------------------
    //  Data Structures
    // -----------------------------------------------------------------------

    /**
     * @notice Represents a single loan.
     * @param id              Unique loan identifier.
     * @param borrower        Address of the borrower.
     * @param amount          Principal amount in wei.
     * @param collateral      Collateral posted in wei.
     * @param collateralRatio Collateral ratio at time of origination (e.g. 150).
     * @param startTime       Timestamp when the loan was created.
     * @param dueDate         Timestamp by which the loan must be repaid.
     * @param repaid          Whether the loan has been fully repaid.
     * @param liquidated      Whether the loan has been liquidated.
     */
    struct Loan {
        uint256 id;
        address borrower;
        uint256 amount;
        uint256 collateral;
        uint256 collateralRatio;
        uint256 startTime;
        uint256 dueDate;
        bool repaid;
        bool liquidated;
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    /// @notice Reference to the CreditScoreZK contract.
    ICreditScoreZK public creditScore;

    /// @notice Reference to the CollateralManager contract.
    ICollateralManager public collateralManager;

    /// @notice Auto-incrementing loan ID counter.
    uint256 public loanCounter;

    /// @notice Total amount currently borrowed (outstanding principal).
    uint256 public totalBorrowed;

    /// @notice Mapping from loan ID to Loan struct.
    mapping(uint256 => Loan) public loans;

    /// @notice Mapping from borrower address to their list of loan IDs.
    mapping(address => uint256[]) private _borrowerLoans;

    // -----------------------------------------------------------------------
    //  Anti-Abuse Protection
    // -----------------------------------------------------------------------

    /// @notice Timestamp of each borrower's last loan request.
    mapping(address => uint256) public lastLoanTimestamp;

    /// @notice Number of currently active (non-repaid, non-liquidated) loans per borrower.
    mapping(address => uint256) public activeLoanCount;

    /// @notice Minimum time between successive loans from the same borrower.
    uint256 public constant LOAN_COOLDOWN = 7 days;

    /// @notice Maximum number of concurrent active loans per borrower.
    uint256 public constant MAX_ACTIVE_LOANS = 3;

    // -----------------------------------------------------------------------
    //  Constants
    // -----------------------------------------------------------------------
    uint256 public constant LOAN_DURATION = 30 days;

    /// @notice Maximum pool utilization in basis points (80% = 8000).
    uint256 public constant MAX_UTILIZATION_BPS = 8000;

    /// @notice Interest rate numerator (102 / 100 = 2% flat interest).
    uint256 public constant REPAYMENT_NUMERATOR = 102;

    /// @notice Interest rate denominator.
    uint256 public constant REPAYMENT_DENOMINATOR = 100;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted when a lender deposits BNB into the pool.
    /// @param lender The depositor address.
    /// @param amount The amount deposited in wei.
    event Deposited(address indexed lender, uint256 amount);

    /// @notice Emitted when a new loan is created.
    /// @param loanId          The unique loan ID.
    /// @param borrower        The borrower address.
    /// @param amount          The principal amount.
    /// @param collateral      The collateral posted.
    /// @param collateralRatio The collateral ratio used.
    /// @param dueDate         The repayment deadline.
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount,
        uint256 collateral,
        uint256 collateralRatio,
        uint256 dueDate
    );

    /// @notice Emitted when a loan is repaid.
    /// @param loanId   The unique loan ID.
    /// @param borrower The borrower address.
    /// @param amount   The repayment amount (principal + interest).
    event LoanRepaid(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount
    );

    /// @notice Emitted when a loan is liquidated.
    /// @param loanId     The unique loan ID.
    /// @param borrower   The borrower address.
    /// @param liquidator The address that triggered liquidation.
    event LoanLiquidated(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed liquidator
    );

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    /**
     * @notice Deploys the LendingPool with references to the CreditScoreZK and
     *         CollateralManager contracts.
     * @param _creditScore       Address of the deployed CreditScoreZK contract.
     * @param _collateralManager Address of the deployed CollateralManager contract.
     */
    constructor(
        address _creditScore,
        address _collateralManager
    ) {
        require(
            _creditScore != address(0),
            "LendingPool: credit score is zero address"
        );
        require(
            _collateralManager != address(0),
            "LendingPool: collateral manager is zero address"
        );

        creditScore = ICreditScoreZK(_creditScore);
        collateralManager = ICollateralManager(_collateralManager);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  External — Lender Operations
    // -----------------------------------------------------------------------

    /**
     * @notice Allows lenders to deposit BNB into the pool.
     * @dev Yield (8% APY) is tracked off-chain.
     */
    function depositToPool() external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "LendingPool: deposit must be > 0");

        emit Deposited(msg.sender, msg.value);
    }

    // -----------------------------------------------------------------------
    //  External — Borrower Operations
    // -----------------------------------------------------------------------

    /**
     * @notice Returns the dynamic interest rate for a borrower based on their tier.
     * @dev Platinum: 2%, Gold: 3%, Silver: 4%, Bronze: 5%.
     * @param borrower The borrower address.
     * @return The interest rate as a percentage (2-5).
     */
    function getInterestRate(
        address borrower
    ) public view returns (uint256) {
        (uint8 tier, ) = creditScore.getUserTier(borrower);
        if (tier == 3) return 2; // Platinum - 2%
        if (tier == 2) return 3; // Gold - 3%
        if (tier == 1) return 4; // Silver - 4%
        return 5;                // Bronze - 5%
    }

    /**
     * @notice Requests a new loan from the pool.
     * @dev The caller must send exactly the required collateral as msg.value.
     *      The collateral requirement is determined by the user's credit tier
     *      via CreditScoreZK.getCollateralRequired().
     *
     *      Pool utilization after the loan must not exceed 80%.
     *
     * @param amount The principal amount to borrow in wei.
     */
    function requestLoan(
        uint256 amount
    ) external payable whenNotPaused nonReentrant {
        require(amount > 0, "LendingPool: loan amount must be > 0");
        require(msg.sender != address(this), "LendingPool: no self-lending");
        require(
            block.timestamp >= lastLoanTimestamp[msg.sender] + LOAN_COOLDOWN
                || lastLoanTimestamp[msg.sender] == 0,
            "LendingPool: 7-day cooldown active"
        );
        require(
            activeLoanCount[msg.sender] < MAX_ACTIVE_LOANS,
            "LendingPool: max 3 active loans"
        );

        // --- Collateral check ---
        uint256 requiredCollateral = creditScore.getCollateralRequired(
            msg.sender,
            amount
        );
        require(
            msg.value >= requiredCollateral,
            "LendingPool: insufficient collateral"
        );

        // --- Utilization check (post-loan) ---
        uint256 poolBalance = address(this).balance - msg.value; // balance before this tx's value
        uint256 availableLiquidity = poolBalance; // what we can lend from
        require(
            availableLiquidity >= amount,
            "LendingPool: insufficient pool liquidity"
        );

        // After lending `amount`, total borrowed rises. Check 80% ceiling.
        uint256 totalAssets = poolBalance + totalBorrowed;
        uint256 newTotalBorrowed = totalBorrowed + amount;
        require(
            newTotalBorrowed * 10000 <= totalAssets * MAX_UTILIZATION_BPS,
            "LendingPool: exceeds max utilization (80%)"
        );

        // --- Create loan ---
        uint256 loanId = loanCounter;
        loanCounter += 1;

        (, uint256 colRatio) = creditScore.getUserTier(msg.sender);

        loans[loanId] = Loan({
            id: loanId,
            borrower: msg.sender,
            amount: amount,
            collateral: msg.value,
            collateralRatio: colRatio,
            startTime: block.timestamp,
            dueDate: block.timestamp + LOAN_DURATION,
            repaid: false,
            liquidated: false
        });

        _borrowerLoans[msg.sender].push(loanId);

        // --- Forward collateral to CollateralManager ---
        collateralManager.lockCollateral{value: msg.value}(loanId, msg.sender);

        // --- Track borrowed amount ---
        totalBorrowed += amount;

        // --- Transfer loan principal to borrower ---
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "LendingPool: BNB transfer to borrower failed");

        // --- Update credit score system ---
        creditScore.incrementLoans(msg.sender);

        // --- Anti-abuse tracking ---
        lastLoanTimestamp[msg.sender] = block.timestamp;
        activeLoanCount[msg.sender]++;

        emit LoanCreated(
            loanId,
            msg.sender,
            amount,
            msg.value,
            colRatio,
            block.timestamp + LOAN_DURATION
        );
    }

    /**
     * @notice Repays an existing loan.
     * @dev The caller must be the original borrower and must send at least
     *      principal + 2% interest. On successful repayment the collateral is
     *      released back to the borrower and their credit score is improved.
     *
     * @param loanId The ID of the loan to repay.
     */
    function repayLoan(
        uint256 loanId
    ) external payable whenNotPaused nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.amount > 0, "LendingPool: loan does not exist");
        require(
            msg.sender == loan.borrower,
            "LendingPool: only borrower can repay"
        );
        require(!loan.repaid, "LendingPool: loan already repaid");
        require(!loan.liquidated, "LendingPool: loan already liquidated");

        // --- Dynamic interest based on tier ---
        uint256 rate = getInterestRate(loan.borrower);
        uint256 interest = (loan.amount * rate) / 100;
        uint256 repaymentAmount = loan.amount + interest;
        require(
            msg.value >= repaymentAmount,
            "LendingPool: insufficient repayment (principal + interest)"
        );

        // --- Mark as repaid ---
        loan.repaid = true;

        // --- Reduce outstanding borrows ---
        totalBorrowed -= loan.amount;

        // --- Release collateral back to borrower ---
        collateralManager.releaseCollateral(loanId, loan.borrower);

        // --- Decrement active loan count ---
        if (activeLoanCount[loan.borrower] > 0) {
            activeLoanCount[loan.borrower]--;
        }

        // --- Improve borrower credit score ---
        creditScore.adjustScore(loan.borrower, int256(50));
        creditScore.incrementRepaidLoans(loan.borrower);

        emit LoanRepaid(loanId, loan.borrower, msg.value);
    }

    /**
     * @notice Liquidates an overdue or undercollateralized loan.
     * @dev Anyone can trigger liquidation if the loan is past its due date or
     *      the collateral value has dropped below the safety threshold. The
     *      collateral is sent to the pool and the borrower's credit score is
     *      penalized.
     *
     * @param loanId The ID of the loan to liquidate.
     */
    function liquidateLoan(
        uint256 loanId
    ) external whenNotPaused nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.amount > 0, "LendingPool: loan does not exist");
        require(!loan.repaid, "LendingPool: loan already repaid");
        require(!loan.liquidated, "LendingPool: loan already liquidated");

        bool isOverdue = block.timestamp > loan.dueDate;
        bool isUndercollateralized = collateralManager.isUndercollateralized(
            loanId,
            loan.amount
        );
        require(
            isOverdue || isUndercollateralized,
            "LendingPool: loan is not eligible for liquidation"
        );

        // --- Mark as liquidated ---
        loan.liquidated = true;

        // --- Reduce outstanding borrows ---
        totalBorrowed -= loan.amount;

        // --- Send collateral to the pool ---
        collateralManager.liquidateCollateral(loanId, address(this));

        // --- Decrement active loan count ---
        if (activeLoanCount[loan.borrower] > 0) {
            activeLoanCount[loan.borrower]--;
        }

        // --- Penalize borrower credit score ---
        creditScore.adjustScore(loan.borrower, -int256(100));

        emit LoanLiquidated(loanId, loan.borrower, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  External — View Functions
    // -----------------------------------------------------------------------

    /**
     * @notice Returns all loans associated with a borrower.
     * @param borrower The borrower address.
     * @return An array of Loan structs.
     */
    function getLoansByBorrower(
        address borrower
    ) external view returns (Loan[] memory) {
        uint256[] storage loanIds = _borrowerLoans[borrower];
        Loan[] memory result = new Loan[](loanIds.length);
        for (uint256 i = 0; i < loanIds.length; i++) {
            result[i] = loans[loanIds[i]];
        }
        return result;
    }

    /**
     * @notice Returns the current pool balance (BNB held by this contract).
     * @return The balance in wei.
     */
    function getPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Returns the current pool utilization as a percentage (0-100).
     * @return The utilization percentage.
     */
    function getUtilization() external view returns (uint256) {
        uint256 totalAssets = address(this).balance + totalBorrowed;
        if (totalAssets == 0) return 0;
        return (totalBorrowed * 100) / totalAssets;
    }

    // -----------------------------------------------------------------------
    //  Admin — Emergency Controls
    // -----------------------------------------------------------------------

    /**
     * @notice Pauses all pool operations.
     * @dev Only callable by DEFAULT_ADMIN_ROLE.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses all pool operations.
     * @dev Only callable by DEFAULT_ADMIN_ROLE.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // -----------------------------------------------------------------------
    //  Receive
    // -----------------------------------------------------------------------

    /**
     * @notice Allows the contract to receive BNB (e.g. from collateral liquidation).
     */
    receive() external payable {}
}
