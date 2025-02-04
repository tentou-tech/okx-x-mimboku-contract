// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

import {IStoryNFT} from "./IStoryNFT.sol";

/// @title Story NFT Interface
/// @notice A Story NFT is a soulbound NFT that has an unified token URI for all tokens.
interface IOKXxStoryProtocolOdysseyMint is IStoryNFT, IERC721Metadata {
    ////////////////////////////////////////////////////////////////////////////
    //                              Errors                                    //
    ////////////////////////////////////////////////////////////////////////////
    /// @notice Invalid whitelist signature.
    error OKXxStoryProtocolOdysseyMint__InvalidSignature();

    /// @notice The provided whitelist signature is already used.
    error OKXxStoryProtocolOdysseyMint__SignatureAlreadyUsed();

    /// @notice s are soulbound, cannot be transferred.
    error OKXxStoryProtocolOdysseyMint__TransferLocked();

    /// @notice Zero address provided as a param to OKXxStoryProtocolOdysseyMint functions.
    error OKXxStoryProtocolOdysseyMint__ZeroAddressParam();

    error ExceedPerAddressLimit();
    error ExceedMaxSupply();
    error NotActive();
    error NonExistStage();
    error ExistStage();
    error InvalidStageMaxSupply();
    error InvalidMaxSupply();
    error InvalidConfig();
    error InvalidAdminOrOwner();
    error ExpiredSignature();
    error ExceedMaxSupplyForStage();

    enum MintType {
        Public,
        Allowlist
    }

    ////////////////////////////////////////////////////////////////////////////
    //                              Structs                                   //
    ////////////////////////////////////////////////////////////////////////////
    /// @notice Struct for custom data for initializing the OKXxStoryProtocolOdysseyMint contract.
    /// @param tokenURI The token URI for all the s (follows OpenSea metadata standard).
    /// @param signer The signer of the whitelist signatures.
    /// @param ipMetadataURI The URI of the metadata for all IP from this collection.
    /// @param ipMetadataHash The hash of the metadata for all IP from this collection.
    /// @param nftMetadataHash The hash of the metadata for all IP NFTs from this collection.
    struct CustomInitParams {
        string tokenURI;
        address signer;
        string ipMetadataURI;
        bytes32 ipMetadataHash;
        bytes32 nftMetadataHash;
    }

    /**
     * @notice The mint details for each stage
     *
     * @param enableSig                If needs server signature.
     * @param limitationForAddress     The mint amountlimitation for each address in a stage.
     * @param maxSupplyForStage        The max supply for a stage.
     * @param startTime                The start time of a stage.
     * @param endTime                  The end time of a stage.
     * @param price                    The mint price in a stage.
     * @param paymentToken             The mint paymentToken in a stage.
     * @param payeeAddress             The payeeAddress in a stage.
     * @param allowListMerkleRoot      The allowListMerkleRoot in a stage.
     * @param stage                    The tag of the stage.
     * @param mintType                 Mint type. e.g.Public,Allowlist,Signd
     */
    struct StageMintInfo {
        bool enableSig; //8bits
        uint8 limitationForAddress; //16bits
        uint32 maxSupplyForStage; //48bits
        uint64 startTime; //112bits
        uint64 endTime; //176bits
        uint256 price; //240bits
        address paymentToken;
        address payeeAddress;
        bytes32 allowListMerkleRoot;
        string stage;
        MintType mintType;
    }

    /**
     * @notice The parameter of mint.
     *
     * @param amount     The amount of mint.
     * @param tokenId    Unused.
     * @param nonce      Random number.For server signature, only used in enableSig is true.
     * @param expiry     The expiry of server signature, only used in enableSig is true.
     * @param to         The to address of the mint.
     */
    struct MintParams {
        uint256 amount;
        uint256 tokenId;
        uint256 nonce;
        uint256 expiry;
        address to;
    }

    ////////////////////////////////////////////////////////////////////////////
    //                              Events                                    //
    ////////////////////////////////////////////////////////////////////////////
    /// @notice Emitted when a NFT is minted.
    /// @param recipient The address of the recipient of the NFT.
    /// @param tokenId The token ID of the minted NFT.
    /// @param ipId The ID of the NFT IP.
    event OKXxStoryProtocolOdysseyMintMinted(address recipient, uint256 tokenId, address ipId);

    /// @notice Emitted when the signer is updated.
    /// @param signer The new signer address.
    event OKXxStoryProtocolOdysseyMintSignerUpdated(address signer);

    event StageMintTimeSet(string stage, uint64 startTime, uint64 endTime);
    event StageMintLimitationPerAddressSet(string stage, uint8 mintLimitationPerAddress);
    event StageMaxSupplySet(string stage, uint32 maxSupply);
    event MaxSupplySet(uint32 maxSupply);
    event StageEnableSigSet(string stage, bool enableSig);
    event StageMintInfoSet(StageMintInfo stageMintInfo);
    event AdminSet(address admin);

    /// @notice Mints a for the given recipient, registers it as an IP,
    ///         and makes it a derivative of the organization IP.
    /// @param stage         Identification of the stage
    /// @param signature     The signature from the whitelist signer. This signautre is genreated by having the whitelist
    /// @param proof         The proof for the leaf of the allowlist in a stage if mint type is Allowlist.
    /// @param mintparams    The mint parameter
    /// signer sign the caller's address (msg.sender) for this `mint` function.
    /// @return tokenId The token ID of the minted NFT.
    /// @return ipId The ID of the NFT IP.
    function mint(
        string calldata stage,
        bytes calldata signature,
        bytes32[] calldata proof,
        MintParams calldata mintparams
    ) external returns (uint256 tokenId, address ipId);

    /// @notice Updates the whitelist signer.
    /// @param signer_ The new whitelist signer address.
    function setSigner(address signer_) external;
}
