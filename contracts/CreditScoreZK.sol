// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CreditScoreZK
 * @author CredLink ZK Team
 * @notice ZK-based behavioral credit scoring system on BNB Chain.
 * @dev Manages on-chain credit scores derived from zero-knowledge proofs of
 *      off-chain behavioral data. Each address is assigned a score (0-1000),
 *      a tier (0-3), and a corresponding collateral ratio that determines how
 *      much collateral the user must post when borrowing from the lending pool.
 *
 * INVARIANTS:
 *   INV-1: 0 <= score <= 1000 for every user at all times.
 *   INV-2: tier is deterministically derived from score:
 *            score < 200  => tier 0, ratio 150
 *            200 <= score < 500 => tier 1, ratio 135
 *            500 <= score < 750 => tier 2, ratio 125
 *            score >= 750 => tier 3, ratio 110
 *   INV-3: collateralRatio in {110, 125, 135, 150}.
 *   INV-4: identityToWallet and walletToIdentity form a bijection —
 *          each identity hash maps to exactly one wallet and vice versa.
 *   INV-5: identityVerified[w] == true iff walletToIdentity[w] != bytes32(0).
 *   INV-6: lastScoreActivity[user] is set on every score mutation.
 *   INV-7: Decay can only reduce a score, never increase it.
 *
 * ARCHITECTURE:
 *   Central reputation registry. All other contracts reference it for credit
 *   decisions. The score is never directly modifiable by users — only by
 *   authorized contracts after verification.
 *
 * ECONOMIC ASSUMPTIONS:
 *   - Higher scores correlate with lower default risk.
 *   - +50 per successful repayment and -100 per liquidation creates
 *     asymmetric incentives favoring good behavior.
 *   - Reputation decay prevents stale scores from persisting indefinitely.
 *
 * ATTACK RESISTANCE:
 *   - Sybil resistance via Moca identity binding (1 identity = 1 wallet).
 *   - Role-based access prevents unauthorized score manipulation.
 *   - Pausable for emergency intervention.
 *   - Score clamping prevents overflow/underflow.
 *
 * UPGRADE PATH:
 *   - Integrate GovernanceStub for dynamic tier thresholds.
 *   - Add cross-chain score syncing via CrossChainScoreOracle.
 *   - Move decay parameters to governance-controlled values.
 */
contract CreditScoreZK is AccessControl, ReentrancyGuard, Pausable {
    // -----------------------------------------------------------------------
    //  Custom Errors
    // -----------------------------------------------------------------------

    /// @dev Reverts when a zero address is passed where a valid address is required.
    error ZeroAddress();

    /// @dev Reverts when a score exceeds the maximum of 1000.
    error ScoreExceedsMaximum(uint256 provided);

    /// @dev Reverts when an operation requires a verified Moca identity.
    error IdentityNotVerified(address wallet);

    /// @dev Reverts when attempting to bind an identity that is already bound.
    error IdentityAlreadyBound(bytes32 identityHash);

    /// @dev Reverts when a wallet already has a bound identity.
    error WalletAlreadyBound(address wallet);

    /// @dev Reverts when decay is requested but the user's score is already zero.
    error ScoreAlreadyZero(address user);

    /// @dev Reverts when there is no activity record to compute decay from.
    error NoActivityRecord(address user);

    /// @dev Reverts when the user has not been inactive long enough for decay.
    error DecayNotEligible(address user, uint256 elapsed, uint256 threshold);

    // -----------------------------------------------------------------------
    //  Roles
    // -----------------------------------------------------------------------

    /// @notice Role assigned to the ZK verifier contract that may set absolute scores.
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    /// @notice Role assigned to the lending pool contract that may adjust scores
    ///         and track loan activity.
    bytes32 public constant LENDING_POOL_ROLE = keccak256("LENDING_POOL_ROLE");

    // -----------------------------------------------------------------------
    //  Data Structures
    // -----------------------------------------------------------------------

    /**
     * @notice Per-user credit profile stored on-chain.
     * @dev Struct packing: `tier` (uint8) and padding are packed into one slot
     *      after `score` (uint256) occupies its own slot. Booleans could further
     *      pack with tier but are stored in separate mappings for clarity.
     *
     * @param score           Credit score in [0, 1000].
     * @param tier            Credit tier (0-3) derived from `score`.
     * @param collateralRatio Required collateral ratio (e.g. 150 = 150%).
     * @param totalLoans      Lifetime loan count.
     * @param repaidLoans     Lifetime repaid loan count.
     * @param lastUpdated     Timestamp of last profile mutation.
     */
    struct UserProfile {
        uint256 score;
        uint8 tier;
        uint256 collateralRatio;
        uint256 totalLoans;
        uint256 repaidLoans;
        uint256 lastUpdated;
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    /// @notice Mapping from user address to their credit profile.
    mapping(address => UserProfile) private _profiles;

    // -----------------------------------------------------------------------
    //  Identity Binding (Moca Wallet Integration)
    // -----------------------------------------------------------------------

    /// @notice Mapping from identity hash to bound wallet address.
    mapping(bytes32 => address) public identityToWallet;

    /// @notice Mapping from wallet address to bound identity hash.
    mapping(address => bytes32) public walletToIdentity;

    /// @notice Whether a wallet has a verified identity bound.
    mapping(address => bool) public identityVerified;

    // -----------------------------------------------------------------------
    //  Reputation Decay
    // -----------------------------------------------------------------------

    /// @notice Timestamp of each user's last score-changing activity.
    mapping(address => uint256) public lastScoreActivity;

    /// @notice Duration of moderate inactivity before minor decay (180 days).
    uint256 public constant DECAY_THRESHOLD_MODERATE = 180 days;

    /// @notice Duration of severe inactivity before major decay (365 days).
    uint256 public constant DECAY_THRESHOLD_SEVERE = 365 days;

    /// @notice Points deducted for moderate inactivity (180+ days).
    int256 public constant DECAY_PENALTY_MODERATE = -20;

    /// @notice Points deducted for severe inactivity (365+ days).
    int256 public constant DECAY_PENALTY_SEVERE = -50;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted when a user's credit score is set by the ZK verifier.
    /// @param user     The address whose score was updated.
    /// @param newScore The new absolute score assigned.
    /// @param tier     The new tier derived from the score.
    event ScoreUpdated(address indexed user, uint256 newScore, uint8 tier);

    /// @notice Emitted when a user's credit score is adjusted by the lending pool.
    /// @param user     The address whose score was adjusted.
    /// @param delta    The signed delta applied (positive = improvement).
    /// @param newScore The resulting score after adjustment.
    /// @param tier     The new tier derived from the adjusted score.
    event ScoreAdjusted(address indexed user, int256 delta, uint256 newScore, uint8 tier);

    /// @notice Emitted when a user's total loan count is incremented.
    /// @param user       The borrower address.
    /// @param totalLoans The new total loan count.
    event LoanIncremented(address indexed user, uint256 totalLoans);

    /// @notice Emitted when a user's repaid loan count is incremented.
    /// @param user        The borrower address.
    /// @param repaidLoans The new repaid loan count.
    event RepaidLoanIncremented(address indexed user, uint256 repaidLoans);

    /// @notice Emitted when an identity is bound to a wallet.
    /// @param identityHash The keccak256 hash of the Moca identity ID.
    /// @param wallet       The wallet address the identity is bound to.
    event IdentityBound(bytes32 indexed identityHash, address indexed wallet);

    /// @notice Emitted when a reputation decay is applied.
    /// @param user     The user whose score decayed.
    /// @param penalty  The signed penalty applied.
    /// @param newScore The resulting score.
    /// @param newTier  The resulting tier.
    event ReputationDecayed(address indexed user, int256 penalty, uint256 newScore, uint8 newTier);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    /**
     * @notice Deploys the CreditScoreZK contract and grants admin role to the deployer.
     * @dev New users start with score 0, tier 0, collateral ratio 150.
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  External / Public — Score Management
    // -----------------------------------------------------------------------

    /**
     * @notice Sets a user's credit score from a verified ZK proof.
     * @dev Only callable by the ZK verifier contract (VERIFIER_ROLE).
     *      Recalculates tier and collateral ratio. Requires verified identity.
     * @param user     The address whose score is being updated.
     * @param newScore The new score in [0, 1000].
     */
    function updateScoreFromZK(
        address user,
        uint256 newScore
    ) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        if (user == address(0)) revert ZeroAddress();
        if (newScore > 1000) revert ScoreExceedsMaximum(newScore);
        if (!identityVerified[user]) revert IdentityNotVerified(user);

        UserProfile storage profile = _profiles[user];
        profile.score = newScore;
        _recalculateTier(profile);
        profile.lastUpdated = block.timestamp;
        lastScoreActivity[user] = block.timestamp;

        emit ScoreUpdated(user, newScore, profile.tier);
    }

    /**
     * @notice Adjusts a user's credit score by a signed delta.
     * @dev Only callable by the lending pool (LENDING_POOL_ROLE).
     *      The resulting score is clamped to [0, 1000]. Initializes default
     *      collateral ratio for new profiles.
     * @param user  The address whose score is being adjusted.
     * @param delta The signed change (positive = improvement, negative = penalty).
     */
    function adjustScore(
        address user,
        int256 delta
    ) external onlyRole(LENDING_POOL_ROLE) whenNotPaused {
        if (user == address(0)) revert ZeroAddress();

        UserProfile storage profile = _profiles[user];

        // Initialize default collateral ratio for first-time users.
        if (profile.lastUpdated == 0) {
            profile.collateralRatio = 150;
        }

        int256 updated = int256(profile.score) + delta;

        // Clamp to [0, 1000] — enforces INV-1.
        if (updated < 0) {
            updated = 0;
        } else if (updated > 1000) {
            updated = 1000;
        }

        profile.score = uint256(updated);
        _recalculateTier(profile);
        profile.lastUpdated = block.timestamp;
        lastScoreActivity[user] = block.timestamp;

        emit ScoreAdjusted(user, delta, profile.score, profile.tier);
    }

    // -----------------------------------------------------------------------
    //  External / Public — Loan Tracking
    // -----------------------------------------------------------------------

    /**
     * @notice Increments the total loan count for a user.
     * @dev Only callable by the lending pool (LENDING_POOL_ROLE).
     * @param user The borrower address.
     */
    function incrementLoans(
        address user
    ) external onlyRole(LENDING_POOL_ROLE) whenNotPaused {
        if (user == address(0)) revert ZeroAddress();

        UserProfile storage profile = _profiles[user];

        if (profile.lastUpdated == 0) {
            profile.collateralRatio = 150;
        }

        unchecked {
            profile.totalLoans += 1;
        }
        profile.lastUpdated = block.timestamp;

        emit LoanIncremented(user, profile.totalLoans);
    }

    /**
     * @notice Increments the repaid loan count for a user.
     * @dev Only callable by the lending pool (LENDING_POOL_ROLE).
     * @param user The borrower address.
     */
    function incrementRepaidLoans(
        address user
    ) external onlyRole(LENDING_POOL_ROLE) whenNotPaused {
        if (user == address(0)) revert ZeroAddress();

        UserProfile storage profile = _profiles[user];

        if (profile.lastUpdated == 0) {
            profile.collateralRatio = 150;
        }

        unchecked {
            profile.repaidLoans += 1;
        }
        profile.lastUpdated = block.timestamp;

        emit RepaidLoanIncremented(user, profile.repaidLoans);
    }

    // -----------------------------------------------------------------------
    //  External / Public — View Functions
    // -----------------------------------------------------------------------

    /**
     * @notice Calculates the collateral required for a loan of the given amount.
     * @dev Uses the user's current collateral ratio. New users default to 150%.
     * @param user       The borrower address.
     * @param loanAmount The amount the user wishes to borrow.
     * @return The required collateral (loanAmount * collateralRatio / 100).
     */
    function getCollateralRequired(
        address user,
        uint256 loanAmount
    ) external view returns (uint256) {
        uint256 ratio = _profiles[user].collateralRatio;
        if (ratio == 0) ratio = 150;
        return (loanAmount * ratio) / 100;
    }

    /**
     * @notice Returns the tier and collateral ratio for a user.
     * @param user The address to query.
     * @return tier            The user's current tier (0-3).
     * @return collateralRatio The user's current collateral ratio.
     */
    function getUserTier(
        address user
    ) external view returns (uint8 tier, uint256 collateralRatio) {
        UserProfile storage profile = _profiles[user];
        tier = profile.tier;
        collateralRatio = profile.collateralRatio;
        if (collateralRatio == 0) collateralRatio = 150;
    }

    /**
     * @notice Returns the full credit profile for a user.
     * @param user The address to query.
     * @return score           The user's credit score (0-1000).
     * @return tier            The user's tier (0-3).
     * @return collateralRatio The user's collateral ratio.
     * @return totalLoans      Total loans taken.
     * @return repaidLoans     Total loans repaid.
     * @return lastUpdated     Timestamp of last profile update.
     */
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
        )
    {
        UserProfile storage profile = _profiles[user];
        score = profile.score;
        tier = profile.tier;
        collateralRatio = profile.collateralRatio;
        totalLoans = profile.totalLoans;
        repaidLoans = profile.repaidLoans;
        lastUpdated = profile.lastUpdated;
        if (collateralRatio == 0) collateralRatio = 150;
    }

    /**
     * @notice Returns only the credit score for a user.
     * @param user The address to query.
     * @return The user's credit score (0-1000).
     */
    function getScore(address user) external view returns (uint256) {
        return _profiles[user].score;
    }

    // -----------------------------------------------------------------------
    //  External / Public — Reputation Decay
    // -----------------------------------------------------------------------

    /**
     * @notice Applies reputation decay to an inactive user.
     * @dev Anyone can call this. Decay is applied only if the user has a
     *      non-zero score and has been inactive for >= 180 days.
     *
     *      180-364 days inactive => -20 points (moderate)
     *      365+   days inactive => -50 points (severe)
     *
     *      Resets lastScoreActivity to prevent repeated application.
     *
     * @param user The address whose score should be decayed.
     */
    function applyDecay(address user) external whenNotPaused {
        if (user == address(0)) revert ZeroAddress();

        UserProfile storage profile = _profiles[user];
        if (profile.score == 0) revert ScoreAlreadyZero(user);

        uint256 lastActivity = lastScoreActivity[user];
        if (lastActivity == 0) lastActivity = profile.lastUpdated;
        if (lastActivity == 0) revert NoActivityRecord(user);

        uint256 elapsed = block.timestamp - lastActivity;
        if (elapsed < DECAY_THRESHOLD_MODERATE) {
            revert DecayNotEligible(user, elapsed, DECAY_THRESHOLD_MODERATE);
        }

        int256 penalty = elapsed >= DECAY_THRESHOLD_SEVERE
            ? DECAY_PENALTY_SEVERE
            : DECAY_PENALTY_MODERATE;

        int256 updated = int256(profile.score) + penalty;
        if (updated < 0) updated = 0;

        profile.score = uint256(updated);
        _recalculateTier(profile);
        profile.lastUpdated = block.timestamp;
        lastScoreActivity[user] = block.timestamp;

        emit ReputationDecayed(user, penalty, profile.score, profile.tier);
    }

    /**
     * @notice Returns the time since a user's last score activity and decay eligibility.
     * @param user The address to query.
     * @return elapsed   Seconds since last activity.
     * @return decayable Whether the user is eligible for decay.
     */
    function getDecayStatus(
        address user
    ) external view returns (uint256 elapsed, bool decayable) {
        uint256 lastActivity = lastScoreActivity[user];
        if (lastActivity == 0) lastActivity = _profiles[user].lastUpdated;
        if (lastActivity == 0) return (0, false);

        elapsed = block.timestamp - lastActivity;
        decayable = elapsed >= DECAY_THRESHOLD_MODERATE && _profiles[user].score > 0;
    }

    // -----------------------------------------------------------------------
    //  External / Public — Identity Binding
    // -----------------------------------------------------------------------

    /**
     * @notice Binds a Moca identity hash to a wallet address.
     * @dev Only callable by DEFAULT_ADMIN_ROLE. Enforces the bijective mapping
     *      invariant (INV-4): one identity <=> one wallet.
     * @param identityHash The keccak256 hash of the Moca identity ID.
     * @param wallet       The wallet address to bind.
     */
    function bindIdentity(
        bytes32 identityHash,
        address wallet
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (wallet == address(0)) revert ZeroAddress();
        if (identityToWallet[identityHash] != address(0)) {
            revert IdentityAlreadyBound(identityHash);
        }
        if (walletToIdentity[wallet] != bytes32(0)) {
            revert WalletAlreadyBound(wallet);
        }

        identityToWallet[identityHash] = wallet;
        walletToIdentity[wallet] = identityHash;
        identityVerified[wallet] = true;

        emit IdentityBound(identityHash, wallet);
    }

    /**
     * @notice Checks whether a wallet has a verified Moca identity.
     * @param wallet The wallet address to check.
     * @return True if the wallet has a verified identity.
     */
    function isIdentityVerified(address wallet) external view returns (bool) {
        return identityVerified[wallet];
    }

    // -----------------------------------------------------------------------
    //  Admin — Emergency Controls
    // -----------------------------------------------------------------------

    /// @notice Pauses all state-changing operations. Only DEFAULT_ADMIN_ROLE.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses all state-changing operations. Only DEFAULT_ADMIN_ROLE.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // -----------------------------------------------------------------------
    //  Internal Helpers
    // -----------------------------------------------------------------------

    /**
     * @dev Recalculates tier and collateral ratio from score. Enforces INV-2 and INV-3.
     * @param profile The storage reference to the user's profile.
     */
    function _recalculateTier(UserProfile storage profile) internal {
        uint256 score = profile.score;

        if (score >= 750) {
            profile.tier = 3;
            profile.collateralRatio = 110;
        } else if (score >= 500) {
            profile.tier = 2;
            profile.collateralRatio = 125;
        } else if (score >= 200) {
            profile.tier = 1;
            profile.collateralRatio = 135;
        } else {
            profile.tier = 0;
            profile.collateralRatio = 150;
        }
    }
}
