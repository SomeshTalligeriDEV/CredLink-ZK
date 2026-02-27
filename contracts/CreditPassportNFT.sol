// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CreditPassportNFT
 * @author CredLink ZK Team
 * @notice Soulbound (non-transferable) ERC721 representing a user's credit passport.
 *         Each wallet can mint exactly one passport. The passport stores credit score,
 *         tier, verification status, and country. Updatable but never transferable.
 *
 * INVARIANTS:
 *   INV-1: Each wallet mints at most one passport (hasMinted is monotonic true).
 *   INV-2: Tokens are never transferable (soulbound).
 *   INV-3: Only MINTER_ROLE can mint and update passports.
 *   INV-4: tokenURI always returns valid Base64-encoded JSON.
 *
 * ARCHITECTURE:
 *   Identity-linked NFT that serves as an on-chain verifiable credential.
 *   Integrates with CreditScoreZK for score data and ZKVerifier for
 *   verification status.
 *
 * ATTACK RESISTANCE:
 *   - transferFrom, safeTransferFrom, approve, setApprovalForAll all revert.
 *   - Only MINTER_ROLE can create/update passports.
 *   - One passport per wallet enforced by hasMinted mapping.
 *
 * UPGRADE PATH:
 *   - Add ERC-5192 (Minimal Soulbound NFTs) interface support.
 *   - Add batch update capability for protocol-wide score recalculations.
 *   - Integrate on-chain SVG generation for passport images.
 */
contract CreditPassportNFT is ERC721, AccessControl {
    using Strings for uint256;
    using Strings for uint8;

    // -----------------------------------------------------------------------
    //  Custom Errors
    // -----------------------------------------------------------------------

    /// @dev Reverts when a user tries to mint a second passport.
    error AlreadyHasPassport(address user);

    /// @dev Reverts when trying to update a non-existent passport.
    error NoPassportToUpdate(address user);

    /// @dev Reverts when querying a passport that doesn't exist.
    error NoPassportFound(address user);

    /// @dev Reverts on any transfer attempt (soulbound).
    error SoulboundNonTransferable();

    // -----------------------------------------------------------------------
    //  Roles
    // -----------------------------------------------------------------------

    /// @notice Role assigned to contracts/addresses that can mint and update passports.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // -----------------------------------------------------------------------
    //  Data Structures
    // -----------------------------------------------------------------------

    /**
     * @notice Data stored in each credit passport NFT.
     * @param score        Credit score (0-1000).
     * @param tier         Credit tier (0-3).
     * @param lastUpdated  Timestamp of last update.
     * @param zkVerified   Whether the user has a verified ZK proof.
     * @param mocaVerified Whether the user has a verified Moca identity.
     * @param country      Country where the passport was issued.
     */
    struct PassportData {
        uint256 score;
        uint8 tier;
        uint256 lastUpdated;
        bool zkVerified;
        bool mocaVerified;
        string country;
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    /// @notice Mapping from user address to their token ID.
    mapping(address => uint256) public userToTokenId;

    /// @notice Mapping from token ID to its passport data.
    mapping(uint256 => PassportData) public passportData;

    /// @notice Whether a user has already minted a passport.
    mapping(address => bool) public hasMinted;

    /// @notice Auto-incrementing token counter.
    uint256 private _tokenCounter;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted when a new credit passport is minted.
    event PassportMinted(address indexed user, uint256 indexed tokenId, uint256 score, uint8 tier);

    /// @notice Emitted when a passport's data is updated.
    event PassportUpdated(address indexed user, uint256 indexed tokenId, uint256 score, uint8 tier);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor() ERC721("CredLink ZK Credit Passport", "CLZK-PASS") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  External — Mint & Update
    // -----------------------------------------------------------------------

    /**
     * @notice Mints a new soulbound credit passport for a user.
     * @dev Only callable by MINTER_ROLE. Each user can only have one passport.
     * @param user         The address to mint the passport for.
     * @param score        The initial credit score.
     * @param tier         The initial credit tier.
     * @param zkVerified   Whether the user has ZK verification.
     * @param mocaVerified Whether the user has Moca identity verification.
     * @param country      The passport country.
     */
    function mintPassport(
        address user,
        uint256 score,
        uint8 tier,
        bool zkVerified,
        bool mocaVerified,
        string memory country
    ) external onlyRole(MINTER_ROLE) {
        if (hasMinted[user]) revert AlreadyHasPassport(user);

        unchecked { _tokenCounter++; }
        uint256 tokenId = _tokenCounter;

        _safeMint(user, tokenId);

        passportData[tokenId] = PassportData({
            score: score,
            tier: tier,
            lastUpdated: block.timestamp,
            zkVerified: zkVerified,
            mocaVerified: mocaVerified,
            country: country
        });

        userToTokenId[user] = tokenId;
        hasMinted[user] = true;

        emit PassportMinted(user, tokenId, score, tier);
    }

    /**
     * @notice Updates the score and tier on an existing passport.
     * @dev Only callable by MINTER_ROLE. The user must already have a passport.
     * @param user  The address whose passport to update.
     * @param score The new credit score.
     * @param tier  The new credit tier.
     */
    function updatePassport(
        address user,
        uint256 score,
        uint8 tier
    ) external onlyRole(MINTER_ROLE) {
        if (!hasMinted[user]) revert NoPassportToUpdate(user);

        uint256 tokenId = userToTokenId[user];
        PassportData storage data = passportData[tokenId];
        data.score = score;
        data.tier = tier;
        data.lastUpdated = block.timestamp;

        emit PassportUpdated(user, tokenId, score, tier);
    }

    /**
     * @notice Returns the passport data and token ID for a user.
     * @param user The address to query.
     * @return The PassportData struct and token ID.
     */
    function getPassport(
        address user
    ) external view returns (PassportData memory, uint256 tokenId) {
        if (!hasMinted[user]) revert NoPassportFound(user);
        tokenId = userToTokenId[user];
        return (passportData[tokenId], tokenId);
    }

    // -----------------------------------------------------------------------
    //  Soulbound — Disable Transfers
    // -----------------------------------------------------------------------

    /// @notice Reverts — soulbound tokens cannot be transferred.
    function transferFrom(address, address, uint256) public pure override {
        revert SoulboundNonTransferable();
    }

    /// @notice Reverts — soulbound tokens cannot be transferred.
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert SoulboundNonTransferable();
    }

    /// @notice Reverts — soulbound tokens cannot be approved.
    function approve(address, uint256) public pure override {
        revert SoulboundNonTransferable();
    }

    /// @notice Reverts — soulbound tokens cannot set operator approval.
    function setApprovalForAll(address, bool) public pure override {
        revert SoulboundNonTransferable();
    }

    // -----------------------------------------------------------------------
    //  Token URI — On-chain Metadata
    // -----------------------------------------------------------------------

    /**
     * @notice Returns the on-chain JSON metadata for a passport token.
     * @dev Generates Base64-encoded JSON with score, tier, and verification attributes.
     * @param tokenId The token ID to query.
     * @return The data URI containing Base64-encoded JSON metadata.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        PassportData storage data = passportData[tokenId];

        string memory tierName;
        if (data.tier == 3) tierName = "Platinum";
        else if (data.tier == 2) tierName = "Gold";
        else if (data.tier == 1) tierName = "Silver";
        else tierName = "Bronze";

        // Split into two parts to avoid stack-too-deep.
        string memory part1 = string(
            abi.encodePacked(
                '{"name":"CredLink ZK Credit Passport #',
                tokenId.toString(),
                '","description":"Privacy-preserving credit passport. Valid worldwide. Non-transferable.","attributes":[',
                '{"trait_type":"Score","value":',
                data.score.toString(),
                '},{"trait_type":"Tier","value":"',
                tierName,
                '"}'
            )
        );

        string memory part2 = string(
            abi.encodePacked(
                ',{"trait_type":"ZK Verified","value":"',
                data.zkVerified ? "true" : "false",
                '"},{"trait_type":"Moca Verified","value":"',
                data.mocaVerified ? "true" : "false",
                '"},{"trait_type":"Country","value":"',
                data.country,
                '"}]}'
            )
        );

        string memory json = string(abi.encodePacked(part1, part2));

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        );
    }

    // -----------------------------------------------------------------------
    //  Required Overrides
    // -----------------------------------------------------------------------

    /// @inheritdoc ERC721
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
