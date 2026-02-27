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
 *      Tier thresholds:
 *        - Tier 0: score < 200   -> collateral ratio 150%
 *        - Tier 1: 200 <= score < 500 -> collateral ratio 135%
 *        - Tier 2: 500 <= score < 750 -> collateral ratio 125%
 *        - Tier 3: score >= 750  -> collateral ratio 110%
 *
 *      Only the ZK verifier contract (VERIFIER_ROLE) may set absolute scores,
 *      and only the lending pool (LENDING_POOL_ROLE) may apply incremental
 *      adjustments or track loan activity.
 *
 * ARCHITECTURE:
 *      CreditScoreZK is the central reputation registry. All other contracts
 *      reference it for credit decisions. The score is never directly modifiable
 *      by users — only by authorized contracts after verification.
 *
 * INVARIANTS:
 *      - Score is always in [0, 1000]
 *      - Tier is always in [0, 3] and derived deterministically from score
 *      - CollateralRatio is always one of {110, 125, 135, 150}
 *      - Each identity hash maps to exactly one wallet (bijective)
 *      - Identity verification is required before ZK score updates
 *
 * ECONOMIC ASSUMPTIONS:
 *      - Higher scores correlate with lower default risk
 *      - +50 per successful repayment and -100 per liquidation creates
 *        asymmetric incentives favoring good behavior
 *      - Reputation decay prevents stale scores from persisting indefinitely
 *
 * ATTACK RESISTANCE:
 *      - Sybil resistance via Moca identity binding (one identity = one wallet)
 *      - Role-based access prevents unauthorized score manipulation
 *      - Pausable for emergency intervention
 *      - Score clamping prevents overflow/underflow
 *
 * UPGRADE PATH:
 *      - Integrate GovernanceStub for dynamic tier thresholds
 *      - Add cross-chain score syncing via CrossChainScoreOracle
 *      - Move decay parameters to governance-controlled values
 */
contract CreditScoreZK is AccessControl, ReentrancyGuard, Pausable {
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
     * @param score           Credit score in the range [0, 1000].
     * @param tier            Credit tier (0-3) derived from `score`.
     * @param collateralRatio Required collateral ratio (e.g. 150 means 150%).
     * @param totalLoans      Total number of loans the user has taken.
     * @param repaidLoans     Number of loans the user has fully repaid.
     * @param lastUpdated     Timestamp of the last profile mutation.
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
    //  Reputation Decay (Upgrade 2)
    // -----------------------------------------------------------------------

    /// @notice Timestamp of each user's last score-changing activity.
    mapping(address => uint256) public lastScoreActivity;

    /// @notice Duration of moderate inactivity before minor decay.
    uint256 public constant DECAY_THRESHOLD_MODERATE = 180 days;

    /// @notice Duration of severe inactivity before major decay.
    uint256 public constant DECAY_THRESHOLD_SEVERE = 365 days;

    /// @notice Points deducted for moderate inactivity (180+ days).
    int256 public constant DECAY_PENALTY_MODERATE = -20;

    /// @notice Points deducted for severe inactivity (365+ days).
    int256 public constant DECAY_PENALTY_SEVERE = -50;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted when a user's credit score is updated by the ZK verifier.
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
    event ReputationDecayed(address indexed user, int256 penalty, uint256 newScore, uint8 newTier);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    /**
     * @notice Deploys the CreditScoreZK contract and grants admin role to the deployer.
     * @dev New users start with score 0, tier 0, and collateral ratio 150.
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
     *      Recalculates the tier and collateral ratio based on the new score.
     * @param user     The address whose score is being updated.
     * @param newScore The new score in [0, 1000].
     */
    function updateScoreFromZK(
        address user,
        uint256 newScore
    ) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        require(user != address(0), "CreditScoreZK: zero address");
        require(newScore <= 1000, "CreditScoreZK: score exceeds 1000");
        require(identityVerified[user], "CreditScoreZK: identity not verified via Moca");

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
     *      The resulting score is clamped to [0, 1000]. Recalculates tier and
     *      collateral ratio after the adjustment.
     * @param user  The address whose score is being adjusted.
     * @param delta The signed change to apply (positive = improvement, negative = penalty).
     */
    function adjustScore(
        address user,
        int256 delta
    ) external onlyRole(LENDING_POOL_ROLE) whenNotPaused {
        require(user != address(0), "CreditScoreZK: zero address");

        UserProfile storage profile = _profiles[user];

        // Ensure the profile has a valid default collateral ratio if new.
        if (profile.lastUpdated == 0) {
            profile.collateralRatio = 150;
        }

        int256 current = int256(profile.score);
        int256 updated = current + delta;

        // Clamp to [0, 1000].
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
        require(user != address(0), "CreditScoreZK: zero address");

        UserProfile storage profile = _profiles[user];

        // Ensure the profile has a valid default collateral ratio if new.
        if (profile.lastUpdated == 0) {
            profile.collateralRatio = 150;
        }

        profile.totalLoans += 1;
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
        require(user != address(0), "CreditScoreZK: zero address");

        UserProfile storage profile = _profiles[user];

        // Ensure the profile has a valid default collateral ratio if new.
        if (profile.lastUpdated == 0) {
            profile.collateralRatio = 150;
        }

        profile.repaidLoans += 1;
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
     * @return The required collateral amount (loanAmount * collateralRatio / 100).
     */
    function getCollateralRequired(
        address user,
        uint256 loanAmount
    ) external view returns (uint256) {
        uint256 ratio = _profiles[user].collateralRatio;
        // Default ratio for users with no profile yet.
        if (ratio == 0) {
            ratio = 150;
        }
        return (loanAmount * ratio) / 100;
    }

    /**
     * @notice Returns the tier and collateral ratio for a user.
     * @param user The address to query.
     * @return tier            The user's current tier (0-3).
     * @return collateralRatio The user's current collateral ratio (e.g. 150).
     */
    function getUserTier(
        address user
    ) external view returns (uint8 tier, uint256 collateralRatio) {
        UserProfile storage profile = _profiles[user];
        tier = profile.tier;
        collateralRatio = profile.collateralRatio;
        // Default for users with no profile.
        if (collateralRatio == 0) {
            collateralRatio = 150;
        }
    }

    /**
     * @notice Returns the full credit profile for a user.
     * @param user The address to query.
     * @return score           The user's credit score (0-1000).
     * @return tier            The user's tier (0-3).
     * @return collateralRatio The user's collateral ratio.
     * @return totalLoans      Total loans taken by the user.
     * @return repaidLoans     Total loans repaid by the user.
     * @return lastUpdated     Timestamp of the last profile update.
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
        // Default for users with no profile.
        if (collateralRatio == 0) {
            collateralRatio = 150;
        }
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
    //  External / Public — Reputation Decay (Upgrade 2)
    // -----------------------------------------------------------------------

    /**
     * @notice Applies reputation decay to an inactive user.
     * @dev Anyone can call this function. Decay is applied only if:
     *      - The user has a non-zero score.
     *      - The user has been inactive for at least 180 days.
     *
     *      180-364 days inactive → -20 points
     *      365+ days inactive    → -50 points
     *
     *      The lastScoreActivity timestamp is reset after decay, preventing
     *      repeated decay application in the same period.
     *
     * @param user The address whose score should be decayed.
     */
    function applyDecay(address user) external whenNotPaused {
        require(user != address(0), "CreditScoreZK: zero address");

        UserProfile storage profile = _profiles[user];
        require(profile.score > 0, "CreditScoreZK: score already 0");

        uint256 lastActivity = lastScoreActivity[user];
        // If never set, use lastUpdated from the profile.
        if (lastActivity == 0) {
            lastActivity = profile.lastUpdated;
        }
        require(lastActivity > 0, "CreditScoreZK: no activity record");

        uint256 elapsed = block.timestamp - lastActivity;
        require(elapsed >= DECAY_THRESHOLD_MODERATE, "CreditScoreZK: not eligible for decay");

        int256 penalty;
        if (elapsed >= DECAY_THRESHOLD_SEVERE) {
            penalty = DECAY_PENALTY_SEVERE;
        } else {
            penalty = DECAY_PENALTY_MODERATE;
        }

        int256 current = int256(profile.score);
        int256 updated = current + penalty;
        if (updated < 0) updated = 0;

        profile.score = uint256(updated);
        _recalculateTier(profile);
        profile.lastUpdated = block.timestamp;
        lastScoreActivity[user] = block.timestamp;

        emit ReputationDecayed(user, penalty, profile.score, profile.tier);
    }

    /**
     * @notice Returns the time since a user's last score activity.
     * @param user The address to query.
     * @return elapsed   Seconds since last activity.
     * @return decayable Whether the user is eligible for decay.
     */
    function getDecayStatus(
        address user
    ) external view returns (uint256 elapsed, bool decayable) {
        uint256 lastActivity = lastScoreActivity[user];
        if (lastActivity == 0) {
            lastActivity = _profiles[user].lastUpdated;
        }
        if (lastActivity == 0) return (0, false);

        elapsed = block.timestamp - lastActivity;
        decayable = elapsed >= DECAY_THRESHOLD_MODERATE && _profiles[user].score > 0;
    }

    // -----------------------------------------------------------------------
    //  External / Public — Identity Binding
    // -----------------------------------------------------------------------

    /**
     * @notice Binds a Moca identity hash to a wallet address.
     * @dev Only callable by DEFAULT_ADMIN_ROLE. Each identity can only be
     *      bound to one wallet, and each wallet can only have one identity.
     * @param identityHash The keccak256 hash of the Moca identity ID.
     * @param wallet       The wallet address to bind.
     */
    function bindIdentity(
        bytes32 identityHash,
        address wallet
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            identityToWallet[identityHash] == address(0),
            "CreditScoreZK: identity already bound to another wallet"
        );
        require(
            walletToIdentity[wallet] == bytes32(0),
            "CreditScoreZK: wallet already has identity"
        );

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
    function isIdentityVerified(
        address wallet
    ) external view returns (bool) {
        return identityVerified[wallet];
    }

    // -----------------------------------------------------------------------
    //  Admin — Emergency Controls
    // -----------------------------------------------------------------------

    /**
     * @notice Pauses all state-changing operations.
     * @dev Only callable by DEFAULT_ADMIN_ROLE.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses all state-changing operations.
     * @dev Only callable by DEFAULT_ADMIN_ROLE.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // -----------------------------------------------------------------------
    //  Internal Helpers
    // -----------------------------------------------------------------------

    /**
     * @dev Recalculates the tier and collateral ratio for a profile based on its score.
     *
     *      Tier 0: score < 200   -> 150%
     *      Tier 1: 200-499       -> 135%
     *      Tier 2: 500-749       -> 125%
     *      Tier 3: 750+          -> 110%
     *
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
