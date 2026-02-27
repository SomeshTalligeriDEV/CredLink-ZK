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
    function getCollateralRequired(address user, uint256 loanAmount) external view returns (uint256);
    function getUserTier(address user) external view returns (uint8 tier, uint256 collateralRatio);
    function adjustScore(address user, int256 delta) external;
    function incrementLoans(address user) external;
    function incrementRepaidLoans(address user) external;
    function getScore(address user) external view returns (uint256);
    function getUserProfile(address user)
        external
        view
        returns (uint256 score, uint8 tier, uint256 collateralRatio, uint256 totalLoans, uint256 repaidLoans, uint256 lastUpdated);
}

/**
 * @title ICollateralManager
 * @notice Interface for the CollateralManager contract used by the lending pool.
 */
interface ICollateralManager {
    function lockCollateral(uint256 loanId, address borrower) external payable;
    function releaseCollateral(uint256 loanId, address to) external;
    function liquidateCollateral(uint256 loanId, address pool) external;
    function getCollateralValue(uint256 loanId) external view returns (uint256);
    function isUndercollateralized(uint256 loanId, uint256 loanAmount) external view returns (bool);
}

// ---------------------------------------------------------------------------
//  Contract
// ---------------------------------------------------------------------------

/**
 * @title LendingPool
 * @author CredLink ZK Team
 * @notice Decentralised lending pool for BNB Chain that uses ZK-based credit
 *         scores to determine collateral requirements.
 *
 * INVARIANTS:
 *   INV-1: totalBorrowed <= 80% of (address(this).balance + totalBorrowed)
 *          at all times after any state-changing operation.
 *   INV-2: Every active loan has matching collateral in CollateralManager.
 *   INV-3: activeLoanCount[user] == count of non-repaid, non-liquidated loans.
 *   INV-4: A loan's state transitions: active -> repaid OR active -> liquidated (never both).
 *   INV-5: lenderDeposits[addr] <= totalLiquidity for any single lender.
 *   INV-6: totalLiquidity == sum(lenderDeposits[i]) for all lenders.
 *   INV-7: No BNB transfer occurs before all state mutations are complete (CEI pattern).
 *
 * ARCHITECTURE:
 *   Core financial engine coordinating between CreditScoreZK (reads tier,
 *   writes score adjustments), CollateralManager (collateral escrow),
 *   lenders (deposits/withdrawals), and borrowers (loans/repayments).
 *
 * ECONOMIC ASSUMPTIONS:
 *   - Dynamic interest: Platinum 2%, Gold 3%, Silver 4%, Bronze 5%.
 *   - Dynamic lender APY: 4% (low util), 6% (medium), 8% (high).
 *   - 7-day cooldown between loans prevents rapid cycling.
 *   - 1-hour minimum lock prevents flash loan exploits.
 *
 * ATTACK RESISTANCE:
 *   - ReentrancyGuard on all payable/external-call functions.
 *   - Checks-effects-interactions on all ETH transfers.
 *   - Same-block deposit+borrow prevention.
 *   - Anomaly scoring with admin flagging.
 *   - Max 3 concurrent loans per borrower.
 *   - No self-lending (msg.sender != address(this)).
 *
 * UPGRADE PATH:
 *   - Connect to GovernanceStub for dynamic parameter control.
 *   - Add ERC20 token support for multi-asset lending.
 *   - Integrate Chainlink price feeds for collateral valuation.
 *   - Implement time-weighted APY distribution for lenders.
 */
contract LendingPool is AccessControl, ReentrancyGuard, Pausable {
    // -----------------------------------------------------------------------
    //  Custom Errors
    // -----------------------------------------------------------------------

    /// @dev Reverts when a zero address is provided.
    error ZeroAddress();

    /// @dev Reverts when deposit amount is zero.
    error DepositMustBePositive();

    /// @dev Reverts when withdrawal amount is zero.
    error WithdrawAmountZero();

    /// @dev Reverts when withdrawal exceeds the lender's deposited balance.
    error ExceedsDepositedBalance(address lender, uint256 requested, uint256 available);

    /// @dev Reverts when pool reserves are insufficient for withdrawal.
    error InsufficientPoolReserves(uint256 requested, uint256 available);

    /// @dev Reverts when loan amount is zero.
    error LoanAmountZero();

    /// @dev Reverts on self-lending attempts.
    error SelfLendingProhibited();

    /// @dev Reverts when borrower is in cooldown period.
    error CooldownActive(address borrower, uint256 availableAt);

    /// @dev Reverts when borrower has reached max active loans.
    error MaxActiveLoansReached(address borrower, uint256 max);

    /// @dev Reverts when borrow is attempted in same block as deposit.
    error SameBlockBorrowProhibited(address borrower);

    /// @dev Reverts when borrower's anomaly score is too high.
    error AddressFlaggedAnomaly(address borrower, uint256 anomalyScore);

    /// @dev Reverts when collateral is insufficient for the loan.
    error InsufficientCollateral(uint256 required, uint256 provided);

    /// @dev Reverts when pool has insufficient liquidity for the loan.
    error InsufficientLiquidity(uint256 requested, uint256 available);

    /// @dev Reverts when pool utilization would exceed 80%.
    error UtilizationExceeded(uint256 newBorrowed, uint256 maxAllowed);

    /// @dev Reverts when loan does not exist.
    error LoanDoesNotExist(uint256 loanId);

    /// @dev Reverts when caller is not the borrower of the loan.
    error NotBorrower(uint256 loanId, address caller);

    /// @dev Reverts when loan has already been repaid.
    error LoanAlreadyRepaid(uint256 loanId);

    /// @dev Reverts when loan has already been liquidated.
    error LoanAlreadyLiquidated(uint256 loanId);

    /// @dev Reverts when repayment is attempted before minimum delay.
    error RepayTooEarly(uint256 loanId, uint256 availableAt);

    /// @dev Reverts when repayment amount is insufficient.
    error InsufficientRepayment(uint256 required, uint256 provided);

    /// @dev Reverts when loan is not eligible for liquidation.
    error LoanNotLiquidatable(uint256 loanId);

    /// @dev Reverts when BNB transfer fails.
    error TransferFailed(address to, uint256 amount);

    // -----------------------------------------------------------------------
    //  Data Structures
    // -----------------------------------------------------------------------

    /**
     * @notice Represents a single loan.
     * @param id              Unique loan identifier.
     * @param borrower        Address of the borrower.
     * @param amount          Principal amount in wei.
     * @param collateral      Collateral posted in wei.
     * @param collateralRatio Collateral ratio at origination (e.g. 150 = 150%).
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
    ICreditScoreZK public immutable creditScore;

    /// @notice Reference to the CollateralManager contract.
    ICollateralManager public immutable collateralManager;

    /// @notice Auto-incrementing loan ID counter.
    uint256 public loanCounter;

    /// @notice Total amount currently borrowed (outstanding principal).
    uint256 public totalBorrowed;

    /// @notice Mapping from loan ID to Loan struct.
    mapping(uint256 => Loan) public loans;

    /// @notice Mapping from borrower address to their list of loan IDs.
    mapping(address => uint256[]) private _borrowerLoans;

    // -----------------------------------------------------------------------
    //  Liquidity Provider Accounting
    // -----------------------------------------------------------------------

    /// @notice Per-lender total deposited amount.
    mapping(address => uint256) public lenderDeposits;

    /// @notice Total liquidity deposited by all lenders (tracked explicitly).
    uint256 public totalLiquidity;

    /// @notice Total interest earned by the pool (from repayments).
    uint256 public totalInterestEarned;

    // -----------------------------------------------------------------------
    //  Anti-Abuse Protection
    // -----------------------------------------------------------------------

    /// @notice Timestamp of each borrower's last loan request.
    mapping(address => uint256) public lastLoanTimestamp;

    /// @notice Number of currently active loans per borrower.
    mapping(address => uint256) public activeLoanCount;

    /// @notice Minimum time between successive loans from the same borrower.
    uint256 public constant LOAN_COOLDOWN = 7 days;

    /// @notice Maximum number of concurrent active loans per borrower.
    uint256 public constant MAX_ACTIVE_LOANS = 3;

    // -----------------------------------------------------------------------
    //  Advanced Anti-Abuse
    // -----------------------------------------------------------------------

    /// @notice Block number of each address's last deposit.
    mapping(address => uint256) public lastDepositBlock;

    /// @notice Per-address anomaly score. If >= 3, address is blocked from borrowing.
    mapping(address => uint256) public anomalyScore;

    /// @notice Minimum time after loan creation before repayment is allowed.
    uint256 public constant MIN_REPAY_DELAY = 1 hours;

    // -----------------------------------------------------------------------
    //  Constants
    // -----------------------------------------------------------------------

    /// @notice Default loan duration (30 days).
    uint256 public constant LOAN_DURATION = 30 days;

    /// @notice Maximum pool utilization in basis points (80% = 8000).
    uint256 public constant MAX_UTILIZATION_BPS = 8000;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted when a lender deposits BNB into the pool.
    event Deposited(address indexed lender, uint256 amount);

    /// @notice Emitted when a lender deposits liquidity (tracked version).
    event LiquidityDeposited(address indexed lender, uint256 amount, uint256 totalDeposited);

    /// @notice Emitted when a lender withdraws liquidity.
    event LiquidityWithdrawn(address indexed lender, uint256 amount);

    /// @notice Emitted when an anomaly is flagged for a borrower.
    event AnomalyDetected(address indexed user, uint256 newAnomalyScore, string reason);

    /// @notice Emitted when an anomaly score is cleared by admin.
    event AnomalyCleared(address indexed user);

    /// @notice Emitted when a new loan is created.
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount,
        uint256 collateral,
        uint256 collateralRatio,
        uint256 dueDate
    );

    /// @notice Emitted when a loan is repaid.
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount);

    /// @notice Emitted when a loan is liquidated.
    event LoanLiquidated(uint256 indexed loanId, address indexed borrower, address indexed liquidator);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    /**
     * @notice Deploys the LendingPool with references to CreditScoreZK and CollateralManager.
     * @param _creditScore       Address of the deployed CreditScoreZK contract.
     * @param _collateralManager Address of the deployed CollateralManager contract.
     */
    constructor(address _creditScore, address _collateralManager) {
        if (_creditScore == address(0)) revert ZeroAddress();
        if (_collateralManager == address(0)) revert ZeroAddress();

        creditScore = ICreditScoreZK(_creditScore);
        collateralManager = ICollateralManager(_collateralManager);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  External — Lender Operations
    // -----------------------------------------------------------------------

    /**
     * @notice Deposits BNB into the pool (simple, untracked deposit).
     * @dev Yield (8% APY) is tracked off-chain. For tracked deposits with
     *      per-lender accounting, use `depositLiquidity()` instead.
     */
    function depositToPool() external payable whenNotPaused nonReentrant {
        if (msg.value == 0) revert DepositMustBePositive();

        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Deposits liquidity into the pool with full per-lender accounting.
     * @dev Records the deposit block to prevent same-block borrow exploits.
     */
    function depositLiquidity() external payable whenNotPaused nonReentrant {
        if (msg.value == 0) revert DepositMustBePositive();

        lenderDeposits[msg.sender] += msg.value;
        totalLiquidity += msg.value;
        lastDepositBlock[msg.sender] = block.number;

        emit LiquidityDeposited(msg.sender, msg.value, lenderDeposits[msg.sender]);
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraws previously deposited liquidity from the pool.
     * @dev CEI pattern: state is updated before the external transfer.
     *      The withdrawal must not reduce pool balance below outstanding loans.
     * @param amount The amount to withdraw in wei.
     */
    function withdrawLiquidity(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert WithdrawAmountZero();
        if (lenderDeposits[msg.sender] < amount) {
            revert ExceedsDepositedBalance(msg.sender, amount, lenderDeposits[msg.sender]);
        }
        if (address(this).balance < amount + totalBorrowed) {
            revert InsufficientPoolReserves(amount, address(this).balance - totalBorrowed);
        }

        // Effects before interactions (CEI pattern) — enforces INV-7.
        lenderDeposits[msg.sender] -= amount;
        totalLiquidity -= amount;

        // Interaction: transfer BNB.
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed(msg.sender, amount);

        emit LiquidityWithdrawn(msg.sender, amount);
    }

    // -----------------------------------------------------------------------
    //  External — Borrower Operations
    // -----------------------------------------------------------------------

    /**
     * @notice Returns the dynamic interest rate for a borrower based on tier.
     * @dev Platinum: 2%, Gold: 3%, Silver: 4%, Bronze: 5%.
     * @param borrower The borrower address.
     * @return The interest rate as a whole percentage (2-5).
     */
    function getInterestRate(address borrower) public view returns (uint256) {
        (uint8 tier, ) = creditScore.getUserTier(borrower);
        if (tier == 3) return 2;
        if (tier == 2) return 3;
        if (tier == 1) return 4;
        return 5;
    }

    /**
     * @notice Requests a new loan from the pool.
     * @dev The caller must send exactly the required collateral as msg.value.
     *      All state mutations are completed before any ETH transfer (CEI pattern).
     *
     *      Anti-abuse checks:
     *      - 7-day cooldown between loans
     *      - Max 3 concurrent active loans
     *      - Cannot borrow in same block as deposit
     *      - Anomaly score must be < 3
     *
     * @param amount The principal amount to borrow in wei.
     */
    function requestLoan(uint256 amount) external payable whenNotPaused nonReentrant {
        if (amount == 0) revert LoanAmountZero();
        if (msg.sender == address(this)) revert SelfLendingProhibited();

        // Anti-abuse: cooldown check.
        uint256 lastLoan = lastLoanTimestamp[msg.sender];
        if (lastLoan != 0 && block.timestamp < lastLoan + LOAN_COOLDOWN) {
            revert CooldownActive(msg.sender, lastLoan + LOAN_COOLDOWN);
        }
        if (activeLoanCount[msg.sender] >= MAX_ACTIVE_LOANS) {
            revert MaxActiveLoansReached(msg.sender, MAX_ACTIVE_LOANS);
        }
        if (lastDepositBlock[msg.sender] >= block.number) {
            revert SameBlockBorrowProhibited(msg.sender);
        }
        if (anomalyScore[msg.sender] >= 3) {
            revert AddressFlaggedAnomaly(msg.sender, anomalyScore[msg.sender]);
        }

        // Collateral check.
        uint256 requiredCollateral = creditScore.getCollateralRequired(msg.sender, amount);
        if (msg.value < requiredCollateral) {
            revert InsufficientCollateral(requiredCollateral, msg.value);
        }

        // Utilization check (post-loan).
        uint256 poolBalance = address(this).balance - msg.value;
        if (poolBalance < amount) {
            revert InsufficientLiquidity(amount, poolBalance);
        }

        uint256 totalAssets = poolBalance + totalBorrowed;
        uint256 newTotalBorrowed = totalBorrowed + amount;
        if (newTotalBorrowed * 10000 > totalAssets * MAX_UTILIZATION_BPS) {
            revert UtilizationExceeded(newTotalBorrowed, (totalAssets * MAX_UTILIZATION_BPS) / 10000);
        }

        // --- Effects: all state mutations before transfers (CEI) ---
        uint256 loanId = loanCounter;
        unchecked { loanCounter += 1; }

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
        totalBorrowed += amount;
        lastLoanTimestamp[msg.sender] = block.timestamp;
        activeLoanCount[msg.sender]++;

        // --- Interactions: external calls after all state is set ---
        collateralManager.lockCollateral{value: msg.value}(loanId, msg.sender);
        creditScore.incrementLoans(msg.sender);

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed(msg.sender, amount);

        emit LoanCreated(loanId, msg.sender, amount, msg.value, colRatio, block.timestamp + LOAN_DURATION);
    }

    /**
     * @notice Repays an existing loan.
     * @dev The caller must be the original borrower and must send at least
     *      principal + dynamic interest. Collateral is released on success.
     *      Credit score is improved by +50.
     * @param loanId The ID of the loan to repay.
     */
    function repayLoan(uint256 loanId) external payable whenNotPaused nonReentrant {
        Loan storage loan = loans[loanId];
        if (loan.amount == 0) revert LoanDoesNotExist(loanId);
        if (msg.sender != loan.borrower) revert NotBorrower(loanId, msg.sender);
        if (loan.repaid) revert LoanAlreadyRepaid(loanId);
        if (loan.liquidated) revert LoanAlreadyLiquidated(loanId);
        if (block.timestamp < loan.startTime + MIN_REPAY_DELAY) {
            revert RepayTooEarly(loanId, loan.startTime + MIN_REPAY_DELAY);
        }

        // Dynamic interest based on tier.
        uint256 rate = getInterestRate(loan.borrower);
        uint256 interest = (loan.amount * rate) / 100;
        uint256 repaymentAmount = loan.amount + interest;
        if (msg.value < repaymentAmount) {
            revert InsufficientRepayment(repaymentAmount, msg.value);
        }

        // --- Effects ---
        loan.repaid = true;
        totalBorrowed -= loan.amount;
        totalInterestEarned += interest;

        if (activeLoanCount[loan.borrower] > 0) {
            activeLoanCount[loan.borrower]--;
        }

        // --- Interactions ---
        collateralManager.releaseCollateral(loanId, loan.borrower);
        creditScore.adjustScore(loan.borrower, int256(50));
        creditScore.incrementRepaidLoans(loan.borrower);

        emit LoanRepaid(loanId, loan.borrower, msg.value);
    }

    /**
     * @notice Liquidates an overdue or undercollateralized loan.
     * @dev Anyone can trigger liquidation if the loan is past due or
     *      undercollateralized. Collateral goes to the pool and borrower's
     *      credit score is penalized by -100.
     * @param loanId The ID of the loan to liquidate.
     */
    function liquidateLoan(uint256 loanId) external whenNotPaused nonReentrant {
        Loan storage loan = loans[loanId];
        if (loan.amount == 0) revert LoanDoesNotExist(loanId);
        if (loan.repaid) revert LoanAlreadyRepaid(loanId);
        if (loan.liquidated) revert LoanAlreadyLiquidated(loanId);

        bool isOverdue = block.timestamp > loan.dueDate;
        bool isUndercollateralized = collateralManager.isUndercollateralized(loanId, loan.amount);
        if (!isOverdue && !isUndercollateralized) revert LoanNotLiquidatable(loanId);

        // --- Effects ---
        loan.liquidated = true;
        totalBorrowed -= loan.amount;

        if (activeLoanCount[loan.borrower] > 0) {
            activeLoanCount[loan.borrower]--;
        }

        // --- Interactions ---
        collateralManager.liquidateCollateral(loanId, address(this));
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
    function getLoansByBorrower(address borrower) external view returns (Loan[] memory) {
        uint256[] storage loanIds = _borrowerLoans[borrower];
        Loan[] memory result = new Loan[](loanIds.length);
        for (uint256 i = 0; i < loanIds.length;) {
            result[i] = loans[loanIds[i]];
            unchecked { ++i; }
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
    //  External — Liquidity Provider Views
    // -----------------------------------------------------------------------

    /**
     * @notice Returns the dynamic APY for lenders based on pool utilization.
     * @dev Utilization < 40% => 4% APY, 40-70% => 6% APY, > 70% => 8% APY.
     * @return apy The annual percentage yield (4, 6, or 8).
     */
    function getLenderAPY() public view returns (uint256 apy) {
        uint256 totalAssets = address(this).balance + totalBorrowed;
        if (totalAssets == 0) return 4;
        uint256 utilization = (totalBorrowed * 100) / totalAssets;

        if (utilization > 70) return 8;
        if (utilization > 40) return 6;
        return 4;
    }

    /**
     * @notice Returns a lender's deposit info and estimated annual yield.
     * @param lender The lender address.
     * @return deposited     Total BNB deposited by this lender.
     * @return currentAPY    Current dynamic APY.
     * @return estimatedYield Approximate annual yield on their deposit.
     */
    function getLenderInfo(address lender)
        external
        view
        returns (uint256 deposited, uint256 currentAPY, uint256 estimatedYield)
    {
        deposited = lenderDeposits[lender];
        currentAPY = getLenderAPY();
        estimatedYield = (deposited * currentAPY) / 100;
    }

    /**
     * @notice Returns a comprehensive pool snapshot for dashboards.
     * @return poolBalance    BNB held by the contract.
     * @return borrowed       Total outstanding loans.
     * @return liquidity      Total tracked lender deposits.
     * @return interestEarned Total interest earned by the pool.
     * @return utilizationPct Pool utilization percentage (0-100).
     * @return currentAPY     Current lender APY.
     */
    function getPoolSnapshot()
        external
        view
        returns (
            uint256 poolBalance,
            uint256 borrowed,
            uint256 liquidity,
            uint256 interestEarned,
            uint256 utilizationPct,
            uint256 currentAPY
        )
    {
        poolBalance = address(this).balance;
        borrowed = totalBorrowed;
        liquidity = totalLiquidity;
        interestEarned = totalInterestEarned;

        uint256 totalAssets = poolBalance + borrowed;
        utilizationPct = totalAssets == 0 ? 0 : (borrowed * 100) / totalAssets;
        currentAPY = getLenderAPY();
    }

    // -----------------------------------------------------------------------
    //  External — Anomaly Management
    // -----------------------------------------------------------------------

    /**
     * @notice Increments the anomaly score for a suspicious address.
     * @dev If anomalyScore reaches 3, the address is blocked from borrowing.
     *      Only callable by DEFAULT_ADMIN_ROLE.
     * @param user   The address to flag.
     * @param reason A human-readable reason for the flag.
     */
    function flagAnomaly(
        address user,
        string calldata reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        anomalyScore[user] += 1;
        emit AnomalyDetected(user, anomalyScore[user], reason);
    }

    /**
     * @notice Resets an anomaly score (rehabilitation).
     * @dev Only callable by DEFAULT_ADMIN_ROLE.
     * @param user The address to clear.
     */
    function clearAnomaly(address user) external onlyRole(DEFAULT_ADMIN_ROLE) {
        anomalyScore[user] = 0;
        emit AnomalyCleared(user);
    }

    // -----------------------------------------------------------------------
    //  Admin — Emergency Controls
    // -----------------------------------------------------------------------

    /// @notice Pauses all pool operations. Only DEFAULT_ADMIN_ROLE.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses all pool operations. Only DEFAULT_ADMIN_ROLE.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // -----------------------------------------------------------------------
    //  Receive
    // -----------------------------------------------------------------------

    /// @notice Allows the contract to receive BNB (e.g. from collateral liquidation).
    receive() external payable {}
}
