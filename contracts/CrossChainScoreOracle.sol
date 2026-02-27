// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CrossChainScoreOracle
 * @author CredLink ZK Team
 * @notice Roadmap contract for cross-chain credit score synchronization.
 *         This contract will allow credit scores verified on BNB Chain to be
 *         recognized on Ethereum, Polygon, Arbitrum, and Base via LayerZero
 *         or Axelar messaging.
 *
 * @dev Current implementation is a placeholder with score storage and sync
 *      events. Production integration requires:
 *      - LayerZero ILayerZeroEndpoint for cross-chain messaging
 *      - Axelar IAxelarGateway as an alternative bridge
 *      - Proof verification from the source chain
 */
contract CrossChainScoreOracle {
    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    /// @notice Address of the CreditScoreZK contract on this chain.
    address public creditScoreContract;

    /// @notice Mapping from user address to their synced score from another chain.
    mapping(address => uint256) public syncedScores;

    /// @notice Mapping from user address to the timestamp of their last sync.
    mapping(address => uint256) public lastSyncTimestamp;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted when a credit score is synced from another chain.
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
     * @param _creditScoreContract Address of the CreditScoreZK contract.
     */
    constructor(address _creditScoreContract) {
        creditScoreContract = _creditScoreContract;
    }

    // -----------------------------------------------------------------------
    //  External — Score Sync (Placeholder)
    // -----------------------------------------------------------------------

    /**
     * @notice Receives a credit score from another chain.
     * @dev Placeholder — in production this would be called by the LayerZero
     *      endpoint or Axelar gateway after verifying the cross-chain message.
     *
     * @param user          The user whose score is being synced.
     * @param score         The credit score from the source chain.
     * @param sourceChainId The chain ID where the score originated.
     * @param proof         Proof data from the source chain (unused in placeholder).
     */
    function syncScoreFromOtherChain(
        address user,
        uint256 score,
        uint256 sourceChainId,
        bytes calldata proof
    ) external {
        // TODO: Verify proof from source chain via LayerZero / Axelar
        // TODO: Validate that msg.sender is the authorized bridge endpoint
        // TODO: Verify score is within valid range [0, 1000]

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
