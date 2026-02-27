// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CollateralManager
 * @author CredLink ZK Team
 * @notice Manages collateral for the CredLink ZK lending pool. Collateral is
 *         locked when a loan is originated, released back to the borrower on
 *         successful repayment, or liquidated to the pool on default.
 *
 * @dev Only the LendingPool contract (LENDING_POOL_ROLE) may lock, release,
 *      or liquidate collateral. The contract is intentionally kept simple and
 *      gas-efficient -- it holds native BNB and tracks per-loan state in a
 *      lightweight struct.
 */
contract CollateralManager is AccessControl, ReentrancyGuard {
    // -----------------------------------------------------------------------
    //  Roles
    // -----------------------------------------------------------------------

    /// @notice Role granted to the LendingPool contract.
    bytes32 public constant LENDING_POOL_ROLE = keccak256("LENDING_POOL_ROLE");

    // -----------------------------------------------------------------------
    //  Data Structures
    // -----------------------------------------------------------------------

    /**
     * @notice Per-loan collateral record.
     * @param amount   Collateral value in wei.
     * @param borrower Address of the borrower who posted the collateral.
     * @param locked   Whether the collateral is currently locked.
     * @param loanId   The loan ID this collateral is associated with.
     */
    struct CollateralInfo {
        uint256 amount;
        address borrower;
        bool locked;
        uint256 loanId;
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    /// @notice Mapping from loan ID to its collateral information.
    mapping(uint256 => CollateralInfo) public collaterals;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted when collateral is locked for a new loan.
    /// @param loanId   The loan ID.
    /// @param borrower The borrower who posted the collateral.
    /// @param amount   The collateral amount in wei.
    event CollateralLocked(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount
    );

    /// @notice Emitted when collateral is released back to the borrower.
    /// @param loanId The loan ID.
    /// @param to     The address receiving the released collateral.
    /// @param amount The collateral amount in wei.
    event CollateralReleased(
        uint256 indexed loanId,
        address indexed to,
        uint256 amount
    );

    /// @notice Emitted when collateral is liquidated and sent to the pool.
    /// @param loanId The loan ID.
    /// @param pool   The pool address receiving the liquidated collateral.
    /// @param amount The collateral amount in wei.
    event CollateralLiquidated(
        uint256 indexed loanId,
        address indexed pool,
        uint256 amount
    );

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    /**
     * @notice Deploys the CollateralManager and grants admin role to the deployer.
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  External — Collateral Operations
    // -----------------------------------------------------------------------

    /**
     * @notice Locks collateral for a new loan.
     * @dev Only callable by the LendingPool (LENDING_POOL_ROLE). The collateral
     *      amount is taken from msg.value.
     * @param loanId   The unique loan ID.
     * @param borrower The borrower who is posting the collateral.
     */
    function lockCollateral(
        uint256 loanId,
        address borrower
    ) external payable onlyRole(LENDING_POOL_ROLE) nonReentrant {
        require(msg.value > 0, "CollateralManager: collateral must be > 0");
        require(
            borrower != address(0),
            "CollateralManager: borrower is zero address"
        );
        require(
            !collaterals[loanId].locked,
            "CollateralManager: collateral already locked for this loan"
        );

        collaterals[loanId] = CollateralInfo({
            amount: msg.value,
            borrower: borrower,
            locked: true,
            loanId: loanId
        });

        emit CollateralLocked(loanId, borrower, msg.value);
    }

    /**
     * @notice Releases collateral back to the specified address (typically the borrower).
     * @dev Only callable by the LendingPool (LENDING_POOL_ROLE).
     * @param loanId The loan ID whose collateral should be released.
     * @param to     The address to send the collateral to.
     */
    function releaseCollateral(
        uint256 loanId,
        address to
    ) external onlyRole(LENDING_POOL_ROLE) nonReentrant {
        CollateralInfo storage info = collaterals[loanId];
        require(info.locked, "CollateralManager: collateral not locked");
        require(to != address(0), "CollateralManager: recipient is zero address");

        uint256 amount = info.amount;
        info.locked = false;
        info.amount = 0;

        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "CollateralManager: BNB transfer failed");

        emit CollateralReleased(loanId, to, amount);
    }

    /**
     * @notice Liquidates collateral and sends it to the pool address.
     * @dev Only callable by the LendingPool (LENDING_POOL_ROLE).
     * @param loanId The loan ID whose collateral should be liquidated.
     * @param pool   The address of the lending pool to receive the collateral.
     */
    function liquidateCollateral(
        uint256 loanId,
        address pool
    ) external onlyRole(LENDING_POOL_ROLE) nonReentrant {
        CollateralInfo storage info = collaterals[loanId];
        require(info.locked, "CollateralManager: collateral not locked");
        require(pool != address(0), "CollateralManager: pool is zero address");

        uint256 amount = info.amount;
        info.locked = false;
        info.amount = 0;

        (bool success, ) = payable(pool).call{value: amount}("");
        require(success, "CollateralManager: BNB transfer failed");

        emit CollateralLiquidated(loanId, pool, amount);
    }

    // -----------------------------------------------------------------------
    //  External — View Functions
    // -----------------------------------------------------------------------

    /**
     * @notice Returns the collateral value for a given loan.
     * @param loanId The loan ID to query.
     * @return The collateral amount in wei.
     */
    function getCollateralValue(
        uint256 loanId
    ) external view returns (uint256) {
        return collaterals[loanId].amount;
    }

    /**
     * @notice Checks whether a loan's collateral has fallen below the safety
     *         threshold of 120% of the loan amount.
     * @param loanId     The loan ID to check.
     * @param loanAmount The outstanding loan principal in wei.
     * @return True if the collateral is below 120% of the loan amount.
     */
    function isUndercollateralized(
        uint256 loanId,
        uint256 loanAmount
    ) external view returns (bool) {
        uint256 collateralValue = collaterals[loanId].amount;
        // Undercollateralized when collateral < 120% of loan amount.
        return collateralValue < (loanAmount * 120) / 100;
    }
}
