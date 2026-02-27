// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title GovernanceStub
 * @author CredLink ZK Team
 * @notice DAO governance preparation contract for CredLink ZK. Stores configurable
 *         protocol parameters that will be governed by a DAO in production.
 *
 * INVARIANTS:
 *   INV-1: minInterestRate <= maxInterestRate, both in [1, 20].
 *   INV-2: silverThreshold < goldThreshold < platinumThreshold <= 1000.
 *   INV-3: moderateDecayDays < severeDecayDays.
 *   INV-4: moderateDecayPenalty < severeDecayPenalty.
 *   INV-5: maxUtilizationBps in [5000, 9500].
 *   INV-6: All setters require DEFAULT_ADMIN_ROLE.
 *
 * ARCHITECTURE:
 *   Centralized parameter store. Currently admin-controlled. Migration path:
 *   1. Deploy a Governor contract (e.g., OpenZeppelin Governor + Timelock).
 *   2. Transfer DEFAULT_ADMIN_ROLE to the Timelock controller.
 *   3. All parameter changes then require a governance vote.
 *
 * ECONOMIC ASSUMPTIONS:
 *   - Interest rates in [1, 20] percent to prevent extreme protocol behavior.
 *   - Decay encourages active participation without destroying value overnight.
 *   - Tier thresholds control the risk appetite of the protocol.
 *
 * ATTACK RESISTANCE:
 *   - All setters require DEFAULT_ADMIN_ROLE.
 *   - Bounds checking prevents invalid configurations.
 *   - Events emitted for off-chain monitoring.
 *
 * UPGRADE PATH:
 *   - Transfer admin to OpenZeppelin Timelock for DAO governance.
 *   - Add parameter change delay (timelock) for transparency.
 *   - Add snapshot mechanism for historical parameter queries.
 */
contract GovernanceStub is AccessControl {
    // -----------------------------------------------------------------------
    //  Custom Errors
    // -----------------------------------------------------------------------

    /// @dev Reverts when a rate value is outside the allowed range.
    error InvalidRate(uint256 value, uint256 min, uint256 max);

    /// @dev Reverts when min exceeds max in a range parameter.
    error MinExceedsMax(uint256 min, uint256 max);

    /// @dev Reverts when tier thresholds are not strictly ascending.
    error InvalidTierOrder(uint256 silver, uint256 gold, uint256 platinum);

    /// @dev Reverts when decay day ordering is violated.
    error InvalidDecayOrder(uint256 moderate, uint256 severe);

    /// @dev Reverts when a penalty value is outside the allowed range.
    error InvalidPenalty(uint256 value, uint256 min, uint256 max);

    /// @dev Reverts when a pool parameter is outside the allowed range.
    error InvalidPoolParam(string param, uint256 value);

    // -----------------------------------------------------------------------
    //  Interest Rate Parameters
    // -----------------------------------------------------------------------

    /// @notice Minimum interest rate (percentage, e.g. 2 = 2%).
    uint256 public minInterestRate = 2;

    /// @notice Maximum interest rate (percentage, e.g. 5 = 5%).
    uint256 public maxInterestRate = 5;

    // -----------------------------------------------------------------------
    //  Reputation Decay Parameters
    // -----------------------------------------------------------------------

    /// @notice Days of inactivity before moderate decay applies.
    uint256 public moderateDecayDays = 180;

    /// @notice Days of inactivity before severe decay applies.
    uint256 public severeDecayDays = 365;

    /// @notice Points deducted for moderate inactivity.
    uint256 public moderateDecayPenalty = 20;

    /// @notice Points deducted for severe inactivity.
    uint256 public severeDecayPenalty = 50;

    // -----------------------------------------------------------------------
    //  Tier Threshold Parameters
    // -----------------------------------------------------------------------

    /// @notice Minimum score for Silver tier.
    uint256 public silverThreshold = 200;

    /// @notice Minimum score for Gold tier.
    uint256 public goldThreshold = 500;

    /// @notice Minimum score for Platinum tier.
    uint256 public platinumThreshold = 750;

    // -----------------------------------------------------------------------
    //  Pool Parameters
    // -----------------------------------------------------------------------

    /// @notice Maximum pool utilization in basis points (8000 = 80%).
    uint256 public maxUtilizationBps = 8000;

    /// @notice Loan duration in seconds.
    uint256 public loanDuration = 30 days;

    /// @notice Cooldown between successive borrows in seconds.
    uint256 public loanCooldown = 7 days;

    /// @notice Maximum concurrent active loans per borrower.
    uint256 public maxActiveLoans = 3;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted when interest rate bounds are updated.
    event InterestRateBoundsUpdated(uint256 min, uint256 max);

    /// @notice Emitted when decay parameters are updated.
    event DecayParametersUpdated(uint256 moderateDays, uint256 severeDays, uint256 moderatePenalty, uint256 severePenalty);

    /// @notice Emitted when tier thresholds are updated.
    event TierThresholdsUpdated(uint256 silver, uint256 gold, uint256 platinum);

    /// @notice Emitted when pool parameters are updated.
    event PoolParametersUpdated(uint256 maxUtilBps, uint256 duration, uint256 cooldown, uint256 maxLoans);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  Setters — Interest Rates
    // -----------------------------------------------------------------------

    /**
     * @notice Updates the interest rate bounds.
     * @dev Enforces INV-1: both in [1, 20] and min <= max.
     * @param _min Minimum interest rate percentage.
     * @param _max Maximum interest rate percentage.
     */
    function setInterestRateBounds(
        uint256 _min,
        uint256 _max
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_min < 1 || _min > 20) revert InvalidRate(_min, 1, 20);
        if (_max < 1 || _max > 20) revert InvalidRate(_max, 1, 20);
        if (_min > _max) revert MinExceedsMax(_min, _max);

        minInterestRate = _min;
        maxInterestRate = _max;

        emit InterestRateBoundsUpdated(_min, _max);
    }

    // -----------------------------------------------------------------------
    //  Setters — Decay Parameters
    // -----------------------------------------------------------------------

    /**
     * @notice Updates the reputation decay parameters.
     * @dev Enforces INV-3 and INV-4.
     * @param _moderateDays    Days before moderate decay.
     * @param _severeDays      Days before severe decay.
     * @param _moderatePenalty Points deducted for moderate inactivity.
     * @param _severePenalty   Points deducted for severe inactivity.
     */
    function setDecayParameters(
        uint256 _moderateDays,
        uint256 _severeDays,
        uint256 _moderatePenalty,
        uint256 _severePenalty
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_moderateDays == 0) revert InvalidPoolParam("moderateDays", _moderateDays);
        if (_severeDays <= _moderateDays) revert InvalidDecayOrder(_moderateDays, _severeDays);
        if (_moderatePenalty == 0 || _moderatePenalty > 100) {
            revert InvalidPenalty(_moderatePenalty, 1, 100);
        }
        if (_severePenalty <= _moderatePenalty || _severePenalty > 200) {
            revert InvalidPenalty(_severePenalty, _moderatePenalty + 1, 200);
        }

        moderateDecayDays = _moderateDays;
        severeDecayDays = _severeDays;
        moderateDecayPenalty = _moderatePenalty;
        severeDecayPenalty = _severePenalty;

        emit DecayParametersUpdated(_moderateDays, _severeDays, _moderatePenalty, _severePenalty);
    }

    // -----------------------------------------------------------------------
    //  Setters — Tier Thresholds
    // -----------------------------------------------------------------------

    /**
     * @notice Updates the score thresholds for each tier.
     * @dev Enforces INV-2: silver < gold < platinum <= 1000.
     * @param _silver   Minimum score for Silver.
     * @param _gold     Minimum score for Gold.
     * @param _platinum Minimum score for Platinum.
     */
    function setTierThresholds(
        uint256 _silver,
        uint256 _gold,
        uint256 _platinum
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_silver >= _gold || _gold >= _platinum || _platinum > 1000) {
            revert InvalidTierOrder(_silver, _gold, _platinum);
        }

        silverThreshold = _silver;
        goldThreshold = _gold;
        platinumThreshold = _platinum;

        emit TierThresholdsUpdated(_silver, _gold, _platinum);
    }

    // -----------------------------------------------------------------------
    //  Setters — Pool Parameters
    // -----------------------------------------------------------------------

    /**
     * @notice Updates the pool operational parameters.
     * @dev Enforces INV-5 and reasonable bounds on all parameters.
     * @param _maxUtilBps Maximum utilization in basis points.
     * @param _duration   Loan duration in seconds.
     * @param _cooldown   Cooldown between loans in seconds.
     * @param _maxLoans   Maximum concurrent active loans.
     */
    function setPoolParameters(
        uint256 _maxUtilBps,
        uint256 _duration,
        uint256 _cooldown,
        uint256 _maxLoans
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_maxUtilBps < 5000 || _maxUtilBps > 9500) {
            revert InvalidPoolParam("maxUtilBps", _maxUtilBps);
        }
        if (_duration < 1 days || _duration > 365 days) {
            revert InvalidPoolParam("duration", _duration);
        }
        if (_cooldown < 1 hours || _cooldown > 30 days) {
            revert InvalidPoolParam("cooldown", _cooldown);
        }
        if (_maxLoans < 1 || _maxLoans > 10) {
            revert InvalidPoolParam("maxLoans", _maxLoans);
        }

        maxUtilizationBps = _maxUtilBps;
        loanDuration = _duration;
        loanCooldown = _cooldown;
        maxActiveLoans = _maxLoans;

        emit PoolParametersUpdated(_maxUtilBps, _duration, _cooldown, _maxLoans);
    }

    // -----------------------------------------------------------------------
    //  View — Configuration Snapshot
    // -----------------------------------------------------------------------

    /**
     * @notice Returns all governance parameters in a single call.
     * @return _minInterestRate  Minimum interest rate.
     * @return _maxInterestRate  Maximum interest rate.
     * @return _moderateDecayDays Days before moderate decay.
     * @return _severeDecayDays   Days before severe decay.
     * @return _silverThreshold   Silver tier threshold.
     * @return _goldThreshold     Gold tier threshold.
     * @return _platinumThreshold Platinum tier threshold.
     * @return _maxUtilizationBps Max utilization in basis points.
     * @return _loanDuration      Loan duration in seconds.
     * @return _maxActiveLoans    Max concurrent active loans.
     */
    function getConfigSnapshot()
        external
        view
        returns (
            uint256 _minInterestRate,
            uint256 _maxInterestRate,
            uint256 _moderateDecayDays,
            uint256 _severeDecayDays,
            uint256 _silverThreshold,
            uint256 _goldThreshold,
            uint256 _platinumThreshold,
            uint256 _maxUtilizationBps,
            uint256 _loanDuration,
            uint256 _maxActiveLoans
        )
    {
        _minInterestRate = minInterestRate;
        _maxInterestRate = maxInterestRate;
        _moderateDecayDays = moderateDecayDays;
        _severeDecayDays = severeDecayDays;
        _silverThreshold = silverThreshold;
        _goldThreshold = goldThreshold;
        _platinumThreshold = platinumThreshold;
        _maxUtilizationBps = maxUtilizationBps;
        _loanDuration = loanDuration;
        _maxActiveLoans = maxActiveLoans;
    }
}
