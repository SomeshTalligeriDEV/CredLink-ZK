// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title CrossChainScoreOracle
 * @author CredLink ZK Team
 * @notice Roadmap contract for cross-chain credit score synchronization.
 *         Allows credit scores verified on BNB Chain to be recognized on
 *         Ethereum, Polygon, Arbitrum, and Base via bridge messaging.
 *
 * INVARIANTS:
 *   INV-1: syncedScores[user] is always in [0, 1000].
 *   INV-2: Only BRIDGE_ROLE can write synced scores (when production-ready).
 *   INV-3: lastSyncTimestamp[user] is updated on every sync.
 *
 * ARCHITECTURE:
 *   Receives cross-chain messages from authorized bridge endpoints and stores
 *   the synced score locally. Production integration requires LayerZero or
 *   Axelar bridge configuration.
 *
 * ATTACK RESISTANCE:
 *   - BRIDGE_ROLE restricts who can update scores.
 *   - Score validated to [0, 1000] range.
 *   - Zero address checks on user parameter.
 *
 * UPGRADE PATH:
 *   - Integrate LayerZero ILayerZeroEndpoint for cross-chain messaging.
 *   - Add Axelar IAxelarGateway as alternative bridge.
 *   - Add proof verification from the source chain.
 *   - Add staleness check (reject scores older than N hours).
 */
contract CrossChainScoreOracle is AccessControl {
    // -----------------------------------------------------------------------
    //  Custom Errors
    // -----------------------------------------------------------------------

    /// @dev Reverts when a zero address is provided.
    error ZeroAddress();

    /// @dev Reverts when synced score exceeds 1000.
    error ScoreOutOfRange(uint256 score);

    // -----------------------------------------------------------------------
    //  Roles
    // -----------------------------------------------------------------------

    /// @notice Role granted to authorized bridge endpoints.
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    /// @notice Address of the CreditScoreZK contract on this chain.
    address public immutable creditScoreContract;

    /// @notice Mapping from user address to their synced score from another chain.
    mapping(address => uint256) public syncedScores;

    /// @notice Mapping from user address to the timestamp of their last sync.
    mapping(address => uint256) public lastSyncTimestamp;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted when a credit score is synced from another chain.
    /// @param user          The user whose score was synced.
    /// @param score         The synced credit score.
    /// @param sourceChainId The chain ID where the score originated.
    /// @param timestamp     The timestamp of the sync.
    event ScoreSynced(
        address indexed user,
        uint256 score,
        uint256 sourceChainId,
        uint256 timestamp
    );

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    /**
     * @notice Deploys the CrossChainScoreOracle.
     * @param _creditScoreContract Address of the CreditScoreZK contract.
     */
    constructor(address _creditScoreContract) {
        if (_creditScoreContract == address(0)) revert ZeroAddress();

        creditScoreContract = _creditScoreContract;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BRIDGE_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  External — Score Sync
    // -----------------------------------------------------------------------

    /**
     * @notice Receives a credit score from another chain.
     * @dev Only callable by BRIDGE_ROLE. In production this would be called
     *      by the LayerZero endpoint or Axelar gateway after verifying the
     *      cross-chain message.
     * @param user          The user whose score is being synced.
     * @param score         The credit score from the source chain (0-1000).
     * @param sourceChainId The chain ID where the score originated.
     * @param proof         Proof data from the source chain (reserved for future use).
     */
    function syncScoreFromOtherChain(
        address user,
        uint256 score,
        uint256 sourceChainId,
        bytes calldata proof
    ) external onlyRole(BRIDGE_ROLE) {
        if (user == address(0)) revert ZeroAddress();
        if (score > 1000) revert ScoreOutOfRange(score);

        // Reserved: proof parameter for future cross-chain verification.
        proof;

        syncedScores[user] = score;
        lastSyncTimestamp[user] = block.timestamp;

        emit ScoreSynced(user, score, sourceChainId, block.timestamp);
    }

    /**
     * @notice Returns the synced score and last sync timestamp for a user.
     * @param user The user address to query.
     * @return score    The synced credit score.
     * @return lastSync The timestamp of the last sync.
     */
    function getSyncedScore(
        address user
    ) external view returns (uint256 score, uint256 lastSync) {
        return (syncedScores[user], lastSyncTimestamp[user]);
    }
}
