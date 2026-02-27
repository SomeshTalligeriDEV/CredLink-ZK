// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title GovernanceStub
 * @author CredLink ZK Team
 * @notice DAO governance preparation contract for CredLink ZK.
 *
 * @dev PURPOSE:
 *      This contract stores configurable protocol parameters that will be
 *      governed by a DAO in production. Currently, only the DEFAULT_ADMIN_ROLE
 *      (deployer) can update parameters. The migration path is:
 *
 *      1. Deploy a Governor contract (e.g., OpenZeppelin Governor + Timelock).
 *      2. Transfer DEFAULT_ADMIN_ROLE to the Timelock controller.
 *      3. All parameter changes then require a governance vote.
 *
 * INVARIANTS:
 *      - Interest rate bounds: minInterestRate <= maxInterestRate
 *      - Tier score thresholds: silverThreshold < goldThreshold < platinumThreshold <= 1000
 *      - Decay thresholds: moderateDecayDays < severeDecayDays
 *      - All penalty values are positive (stored as uint256)
 *
 * ECONOMIC ASSUMPTIONS:
 *      - Interest rates in range [1, 20] percent
 *      - Decay encourages active participation but doesn't destroy value overnight
 *      - Tier thresholds control the risk appetite of the protocol
 *
 * ATTACK RESISTANCE:
 *      - All setters require DEFAULT_ADMIN_ROLE
 *      - Bounds checking prevents invalid configurations
 *      - Events emitted for off-chain monitoring
 */
contract GovernanceStub is AccessControl {
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

    /// @notice Loan cooldown between successive borrows in seconds.
    uint256 public loanCooldown = 7 days;

    /// @notice Maximum concurrent active loans per borrower.
    uint256 public maxActiveLoans = 3;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event InterestRateBoundsUpdated(uint256 min, uint256 max);
    event DecayParametersUpdated(uint256 moderateDays, uint256 severeDays, uint256 moderatePenalty, uint256 severePenalty);
    event TierThresholdsUpdated(uint256 silver, uint256 gold, uint256 platinum);
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
     * @param _min Minimum interest rate percentage (1-20).
     * @param _max Maximum interest rate percentage (1-20).
     */
    function setInterestRateBounds(
        uint256 _min,
        uint256 _max
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_min >= 1 && _min <= 20, "GovernanceStub: invalid min rate");
        require(_max >= 1 && _max <= 20, "GovernanceStub: invalid max rate");
        require(_min <= _max, "GovernanceStub: min > max");

        minInterestRate = _min;
        maxInterestRate = _max;

        emit InterestRateBoundsUpdated(_min, _max);
    }

    // -----------------------------------------------------------------------
    //  Setters — Decay Parameters
    // -----------------------------------------------------------------------

    /**
     * @notice Updates the reputation decay parameters.
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
        require(_moderateDays > 0, "GovernanceStub: moderate days must be > 0");
        require(_severeDays > _moderateDays, "GovernanceStub: severe must be > moderate");
        require(_moderatePenalty > 0 && _moderatePenalty <= 100, "GovernanceStub: invalid moderate penalty");
        require(_severePenalty > _moderatePenalty && _severePenalty <= 200, "GovernanceStub: invalid severe penalty");

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
     * @param _silver   Minimum score for Silver.
     * @param _gold     Minimum score for Gold.
     * @param _platinum Minimum score for Platinum.
     */
    function setTierThresholds(
        uint256 _silver,
        uint256 _gold,
        uint256 _platinum
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_silver < _gold, "GovernanceStub: silver >= gold");
        require(_gold < _platinum, "GovernanceStub: gold >= platinum");
        require(_platinum <= 1000, "GovernanceStub: platinum > 1000");

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
        require(_maxUtilBps >= 5000 && _maxUtilBps <= 9500, "GovernanceStub: invalid utilization");
        require(_duration >= 1 days && _duration <= 365 days, "GovernanceStub: invalid duration");
        require(_cooldown >= 1 hours && _cooldown <= 30 days, "GovernanceStub: invalid cooldown");
        require(_maxLoans >= 1 && _maxLoans <= 10, "GovernanceStub: invalid max loans");

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
