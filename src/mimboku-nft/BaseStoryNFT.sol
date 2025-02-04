// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ERC721URIStorageUpgradeable} from
    "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IDerivativeWorkflows} from
    "@story-protocol/protocol-periphery/contracts/interfaces/workflows/IDerivativeWorkflows.sol";
import {WorkflowStructs} from "@story-protocol/protocol-periphery/contracts/lib/WorkflowStructs.sol";
import {IStoryNFT} from "../interfaces/story-nft/IStoryNFT.sol";

/// @title Base Story NFT
/// @notice Base StoryNFT that implements the core functionality needed for a StoryNFT.
///         To create a new custom StoryNFT, inherit from this contract and override the required functions.
///         Note: the new StoryNFT must be whitelisted in `StoryNFTFactory` by the Story governance in order
///         to use the Story NFT Factory features.
abstract contract BaseStoryNFT is IStoryNFT, ERC721URIStorageUpgradeable, OwnableUpgradeable {
    /// @notice Story Derivative Workflows contract address.
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address public immutable DERIVATIVE_WORKFLOWS;

    /// @dev Storage structure for the BaseStoryNFT
    /// @param contractURI The contract URI of the collection.
    /// @param baseURI The base URI of the collection.
    /// @param totalSupply The total supply of the collection.
    /// @custom:storage-location erc7201:story-protocol-periphery.BaseStoryNFT
    struct BaseStoryNFTStorage {
        string contractURI;
        string baseURI;
        uint256 totalSupply;
    }

    // keccak256(abi.encode(uint256(keccak256("story-protocol-periphery.BaseStoryNFT")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant BaseStoryNFTStorageLocation =
        0x81ed94d7560ff7bef5060a232718049e514c358c346e3254b876807a753c0e00;

    constructor(address derivativeWorkflows) {
        if (derivativeWorkflows == address(0)) {
            revert StoryNFT__ZeroAddressParam();
        }
        DERIVATIVE_WORKFLOWS = derivativeWorkflows;

        _disableInitializers();
    }

    /// @notice Initializes the StoryNFT
    /// @param initParams The initialization parameters for StoryNFT {see {IStoryNFT-StoryNftInitParams}}.
    function __BaseStoryNFT_init(StoryNftInitParams calldata initParams) internal onlyInitializing {
        __Ownable_init(initParams.owner);
        __ERC721URIStorage_init();
        __ERC721_init(initParams.name, initParams.symbol);

        BaseStoryNFTStorage storage $ = _getBaseStoryNFTStorage();
        $.contractURI = initParams.contractURI;
        $.baseURI = initParams.baseURI;

        _customize(initParams.customInitData);
    }

    /// @notice Sets the contractURI of the collection (follows OpenSea contract-level metadata standard).
    /// @param contractURI_ The new contractURI of the collection.
    function setContractURI(string memory contractURI_) external onlyOwner {
        _getBaseStoryNFTStorage().contractURI = contractURI_;

        emit ContractURIUpdated();
    }

    /// @notice Mints a new token and registers as an IP asset.
    /// @param recipient The address to mint the token to.
    /// @param tokenURI_ The token URI of the token (see {ERC721URIStorage-tokenURI} for how it is used).
    /// @param ipMetadataURI The URI of the metadata for the IP.
    /// @param ipMetadataHash The hash of the metadata for the IP.
    /// @param nftMetadataHash The hash of the metadata for the IP NFT.
    /// @return tokenId The ID of the minted token.
    /// @return ipId The ID of the newly created IP.
    function _mintAndRegisterIpAndMakeDerivative(
        address recipient,
        string memory tokenURI_,
        string memory ipMetadataURI,
        bytes32 ipMetadataHash,
        bytes32 nftMetadataHash,
        address[] memory parentIpIds,
        address licenseTemplate,
        uint256[] memory licenseTermsIds,
        bytes memory royaltyContext
    ) internal virtual returns (uint256 tokenId, address ipId) {
        tokenId = ++_getBaseStoryNFTStorage().totalSupply;
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        // register and make derivative IP
        ipId = IDerivativeWorkflows(DERIVATIVE_WORKFLOWS).registerIpAndMakeDerivative(
            address(this),
            tokenId,
            WorkflowStructs.MakeDerivative({
                parentIpIds: parentIpIds,
                licenseTemplate: licenseTemplate,
                licenseTermsIds: licenseTermsIds,
                royaltyContext: royaltyContext,
                maxMintingFee: 0,
                maxRts: 0,
                maxRevenueShare: 0
            }),
            WorkflowStructs.IPMetadata({
                ipMetadataURI: ipMetadataURI,
                ipMetadataHash: ipMetadataHash,
                nftMetadataURI: "",
                nftMetadataHash: nftMetadataHash
            }),
            WorkflowStructs.SignatureData({signer: address(0), deadline: 0, signature: new bytes(0)})
        );
    }

    /// @notice IERC165 interface support.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721URIStorageUpgradeable, IERC165)
        returns (bool)
    {
        return interfaceId == type(IStoryNFT).interfaceId || super.supportsInterface(interfaceId);
    }

    /// @notice Returns the current total supply of the collection.
    function totalSupply() public view returns (uint256) {
        return _getBaseStoryNFTStorage().totalSupply;
    }

    /// @notice Returns the contract URI of the collection (follows OpenSea contract-level metadata standard).
    function contractURI() external view virtual returns (string memory) {
        return _getBaseStoryNFTStorage().contractURI;
    }

    /// @notice Initializes the StoryNFT with custom data, required to be overridden by the inheriting contracts.
    /// @dev This function is called by `initialize` function.
    /// @param customInitData The custom data to initialize the StoryNFT.
    function _customize(bytes memory customInitData) internal virtual;

    /// @notice Returns the base URI of the collection (see {ERC721URIStorage-tokenURI} for how it is used).
    function _baseURI() internal view virtual override returns (string memory) {
        return _getBaseStoryNFTStorage().baseURI;
    }

    /// @dev Returns the storage struct of BaseStoryNFT.
    function _getBaseStoryNFTStorage() private pure returns (BaseStoryNFTStorage storage $) {
        assembly {
            $.slot := BaseStoryNFTStorageLocation
        }
    }
}
