// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CollateralManager
 * @author CredLink ZK Team
 * @notice Manages BNB collateral for the CredLink ZK lending pool. Collateral is
 *         locked when a loan is originated, released back to the borrower on
 *         successful repayment, or liquidated to the pool on default.
 *
 * INVARIANTS:
 *   INV-1: sum(collaterals[i].amount for all locked i) <= address(this).balance.
 *   INV-2: A loan's collateral can only transition: locked -> released OR locked -> liquidated.
 *   INV-3: Only LENDING_POOL_ROLE can trigger state transitions.
 *   INV-4: Collateral amount is zeroed before BNB transfer (CEI pattern).
 *
 * ARCHITECTURE:
 *   Single-responsibility escrow contract. Never makes external calls to
 *   untrusted contracts. Only recipients of BNB transfers are the borrower
 *   (on release) and the pool (on liquidation).
 *
 * ECONOMIC ASSUMPTIONS:
 *   - Collateral is always >= 110% of loan amount (enforced by LendingPool).
 *   - Undercollateralization threshold is 120% (provides 10-40% safety buffer).
 *
 * ATTACK RESISTANCE:
 *   - ReentrancyGuard on all state-changing functions.
 *   - Checks-effects-interactions pattern (state zeroed before transfers).
 *   - Only whitelisted roles can invoke operations.
 *
 * UPGRADE PATH:
 *   - Migrate to UUPS proxy pattern for upgradability.
 *   - Add support for ERC20 collateral tokens beyond native BNB.
 *   - Integrate price oracle for real-time collateral valuation.
 */
contract CollateralManager is AccessControl, ReentrancyGuard {
    // -----------------------------------------------------------------------
    //  Custom Errors
    // -----------------------------------------------------------------------

    /// @dev Reverts when a zero address is provided.
    error ZeroAddress();

    /// @dev Reverts when collateral amount is zero.
    error CollateralMustBePositive();

    /// @dev Reverts when collateral is already locked for a loan.
    error CollateralAlreadyLocked(uint256 loanId);

    /// @dev Reverts when collateral is not locked (cannot release/liquidate).
    error CollateralNotLocked(uint256 loanId);

    /// @dev Reverts when BNB transfer fails.
    error TransferFailed(address to, uint256 amount);

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
    event CollateralLocked(uint256 indexed loanId, address indexed borrower, uint256 amount);

    /// @notice Emitted when collateral is released back to the borrower.
    /// @param loanId The loan ID.
    /// @param to     The address receiving the released collateral.
    /// @param amount The collateral amount in wei.
    event CollateralReleased(uint256 indexed loanId, address indexed to, uint256 amount);

    /// @notice Emitted when collateral is liquidated and sent to the pool.
    /// @param loanId The loan ID.
    /// @param pool   The pool address receiving the liquidated collateral.
    /// @param amount The collateral amount in wei.
    event CollateralLiquidated(uint256 indexed loanId, address indexed pool, uint256 amount);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    /// @notice Deploys the CollateralManager and grants admin role to the deployer.
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  External — Collateral Operations
    // -----------------------------------------------------------------------

    /**
     * @notice Locks collateral for a new loan.
     * @dev Only callable by the LendingPool (LENDING_POOL_ROLE). Collateral
     *      amount is taken from msg.value.
     * @param loanId   The unique loan ID.
     * @param borrower The borrower posting the collateral.
     */
    function lockCollateral(
        uint256 loanId,
        address borrower
    ) external payable onlyRole(LENDING_POOL_ROLE) nonReentrant {
        if (msg.value == 0) revert CollateralMustBePositive();
        if (borrower == address(0)) revert ZeroAddress();
        if (collaterals[loanId].locked) revert CollateralAlreadyLocked(loanId);

        collaterals[loanId] = CollateralInfo({
            amount: msg.value,
            borrower: borrower,
            locked: true,
            loanId: loanId
        });

        emit CollateralLocked(loanId, borrower, msg.value);
    }

    /**
     * @notice Releases collateral back to the specified address.
     * @dev Only callable by the LendingPool (LENDING_POOL_ROLE).
     *      CEI pattern: state zeroed before transfer.
     * @param loanId The loan ID whose collateral should be released.
     * @param to     The address to send the collateral to.
     */
    function releaseCollateral(
        uint256 loanId,
        address to
    ) external onlyRole(LENDING_POOL_ROLE) nonReentrant {
        CollateralInfo storage info = collaterals[loanId];
        if (!info.locked) revert CollateralNotLocked(loanId);
        if (to == address(0)) revert ZeroAddress();

        uint256 amount = info.amount;

        // Effects before interactions (CEI) — enforces INV-4.
        info.locked = false;
        info.amount = 0;

        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert TransferFailed(to, amount);

        emit CollateralReleased(loanId, to, amount);
    }

    /**
     * @notice Liquidates collateral and sends it to the pool address.
     * @dev Only callable by the LendingPool (LENDING_POOL_ROLE).
     *      CEI pattern: state zeroed before transfer.
     * @param loanId The loan ID whose collateral should be liquidated.
     * @param pool   The address of the lending pool.
     */
    function liquidateCollateral(
        uint256 loanId,
        address pool
    ) external onlyRole(LENDING_POOL_ROLE) nonReentrant {
        CollateralInfo storage info = collaterals[loanId];
        if (!info.locked) revert CollateralNotLocked(loanId);
        if (pool == address(0)) revert ZeroAddress();

        uint256 amount = info.amount;

        // Effects before interactions (CEI) — enforces INV-4.
        info.locked = false;
        info.amount = 0;

        (bool success, ) = payable(pool).call{value: amount}("");
        if (!success) revert TransferFailed(pool, amount);

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
    function getCollateralValue(uint256 loanId) external view returns (uint256) {
        return collaterals[loanId].amount;
    }

    /**
     * @notice Checks whether a loan's collateral has fallen below 120% of loan amount.
     * @param loanId     The loan ID to check.
     * @param loanAmount The outstanding loan principal in wei.
     * @return True if the collateral is below 120% of the loan amount.
     */
    function isUndercollateralized(
        uint256 loanId,
        uint256 loanAmount
    ) external view returns (bool) {
        return collaterals[loanId].amount < (loanAmount * 120) / 100;
    }
}
