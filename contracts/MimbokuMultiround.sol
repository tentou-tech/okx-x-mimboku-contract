// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.26;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IIPAssetRegistry} from "@story-protocol/protocol-core/contracts/interfaces/registries/IIPAssetRegistry.sol";
import {ICoreMetadataModule} from
    "@story-protocol/protocol-core/contracts/interfaces/modules/metadata/ICoreMetadataModule.sol";
import {ILicensingModule} from
    "@story-protocol/protocol-core/contracts/interfaces/modules/licensing/ILicensingModule.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISimpleERC721} from "./interfaces/ISimpleERC721.sol";
import {IMimbokuMultiround} from "./interfaces/IMimbokuMultiround.sol";
import {IOKXMultiMint} from "./interfaces/IOKXMultiMint.sol";

contract MimbokuMultiround is IMimbokuMultiround, Initializable, EIP712Upgradeable, AccessControlUpgradeable {
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    /// We need a NFT contract to mint NFTs
    address public NFT_CONTRACT;

    /// We need a MultiRound contract to manage rounds
    address public MULTIROUND_CONTRACT;

    /// @notice Story Proof-of-Creativity PILicense Template address.
    address public PIL_TEMPLATE;

    /// @notice The IP Asset Registry contract address.
    address public IP_ASSET_REGISTRY;

    /// @notice The Core Metadata Module contract address.
    address public CORE_METADATA_MODULE;

    /// @notice The Licensing Module contract address.
    address public LICENSING_MODULE;

    /// @notice Root NFT
    RootNFT public rootNFT;

    /// @notice IP information
    string public ipMetadataURI;
    bytes32 public ipMetadataHash;

    /// @notice The list of the rest token_id
    uint256[] private remainingTokenIds;

    /// @notice Number of remaining token_id
    uint256 private remainingTokenIdCount;

    /// @notice Number of pre-minted NFTs
    uint256 public preMintedCount;

    /// @notice Last minted token ID
    uint256 public lastMintedTokenId;

    /// @notice This flag is used for testing purposes due to the IP workflows contracts deployment.
    /// @dev This flag is false by default. It should be set to true only when testing.
    /// @dev This flag will disable the IP registration and derivative creation.
    bool public isTest;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address defaultAdmin,
        address owner,
        address nftContract,
        address multiRoundContract,
        IPMetadata calldata ipMetadata
    ) public initializer {
        __EIP712_init("OKXMint", "1.0");

        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(OWNER_ROLE, owner);

        // The NFT collection contract
        NFT_CONTRACT = nftContract;

        // The MultiRound contract for managing minting
        MULTIROUND_CONTRACT = multiRoundContract;

        // The ip metadata
        rootNFT = ipMetadata.rootNFT;

        // DEFAULT_LICENSE_TERMS_ID = ipMetadata.defaultLicenseTermsId;
        PIL_TEMPLATE = ipMetadata.pilTemplate;
        IP_ASSET_REGISTRY = ipMetadata.ipAssetRegistry;
        CORE_METADATA_MODULE = ipMetadata.coreMetadataModule;
        LICENSING_MODULE = ipMetadata.licenseModule;
        ipMetadataURI = ipMetadata.ipMetadataURI;
        ipMetadataHash = ipMetadata.ipMetadataHash;
    }

    //////////////////////////////////////////////////////////////////////////////////
    //                               WRITE FUNCTIONS                                //
    //////////////////////////////////////////////////////////////////////////////////

    /// @notice Set number of pre-minted NFTs
    /// @param count The number of pre-minted NFTs
    function setPreMintedCount(uint256 count) external onlyRole(OWNER_ROLE) {
        // update new max supply
        uint256 maxSupplyTemp = IOKXMultiMint(MULTIROUND_CONTRACT).maxSupply();
        maxSupplyTemp -= preMintedCount;
        maxSupplyTemp += count;
        _setMaxSupply(maxSupplyTemp);

        // update the remaining token_id count
        remainingTokenIdCount = IOKXMultiMint(MULTIROUND_CONTRACT).maxSupply();

        // process the new pre-minted NFTs
        _processNewPreMinted(count);
    }

    /// @notice Updates the MULTIROUND_CONTRACT and the NFT_CONTRACT addresses.
    /// @param nftContract The new NFT contract address.
    /// @param multiRoundContract The new MultiRound contract address.
    function setContracts(address nftContract, address multiRoundContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        NFT_CONTRACT = nftContract;
        MULTIROUND_CONTRACT = multiRoundContract;
    }

    /// @notice Updates the whitelist signer.
    /// @param signer_ The new whitelist signer address.
    function setSigner(address signer_) external onlyRole(OWNER_ROLE) {
        IOKXMultiMint(MULTIROUND_CONTRACT).setActiveSigner(signer_, true);
    }

    /// @notice Configure or update the maximum number of nfts that can be minted.
    /// @param newMaxSupply The new maximum number of nfts that can be minted.
    function setMaxSupply(uint256 newMaxSupply) external onlyRole(OWNER_ROLE) {
        _setMaxSupply(newMaxSupply);

        // update the remaining token_id list
        delete remainingTokenIds; // Clear storage before re-allocating
        remainingTokenIds = new uint256[](newMaxSupply); // Allocate storage

        remainingTokenIdCount = newMaxSupply;

        // update the pre-minted count
        _processNewPreMinted(preMintedCount);
    }

    /// @notice Configure or update the information of a certain round according to the stage
    /// @param stageMintInfo The mint information for the stage.
    function setStageMintInfo(IOKXMultiMint.StageMintInfo calldata stageMintInfo) external onlyRole(OWNER_ROLE) {
        IOKXMultiMint(MULTIROUND_CONTRACT).setStageMintInfo(stageMintInfo);

        // update the max supply
        uint256 maxSupplyTemp = IOKXMultiMint(MULTIROUND_CONTRACT).maxSupply();

        // update the remaining token_id list
        delete remainingTokenIds; // Clear storage before re-allocating
        remainingTokenIds = new uint256[](maxSupplyTemp); // Allocate storage

        remainingTokenIdCount = maxSupplyTemp;

        // update the pre-minted count
        _processNewPreMinted(preMintedCount);
    }

    /// @notice Configure or update the mint time for a specific stage.
    /// @param stage Round identification.
    /// @param startTime The start time of the stage.
    /// @param endTime The end time of the stage.
    function setStageMintTime(string calldata stage, uint64 startTime, uint64 endTime) external onlyRole(OWNER_ROLE) {
        IOKXMultiMint(MULTIROUND_CONTRACT).setStageMintTime(stage, startTime, endTime);
    }

    /// @notice According to the stage, set the maximum nft supply for a specific round.
    /// @param stage Round identification.
    /// @param maxSupply_ nft maximum supply.
    function setStageMaxSupply(string calldata stage, uint32 maxSupply_) external onlyRole(OWNER_ROLE) {
        uint256 preMaxSupply = IOKXMultiMint(MULTIROUND_CONTRACT).maxSupply();
        IOKXMultiMint(MULTIROUND_CONTRACT).setStageMaxSupply(stage, maxSupply_);

        // update the max supply
        uint256 newMaxSupply = IOKXMultiMint(MULTIROUND_CONTRACT).maxSupply();
        newMaxSupply -= preMaxSupply;
        newMaxSupply += maxSupply_;
        _setMaxSupply(newMaxSupply);

        // update the remaining token_id list
        delete remainingTokenIds; // Clear storage before re-allocating
        remainingTokenIds = new uint256[](newMaxSupply); // Allocate storage
        remainingTokenIdCount = newMaxSupply;

        // update the pre-minted count
        _processNewPreMinted(preMintedCount);
    }

    /// @notice Set payment information for a specific round based on the stage
    /// @param stage Round identification.
    /// @param payeeAddress Payment address.
    /// @param paymentToken Token contract address for payment (if 0, it is a native token).
    /// @param price Single nft price.
    function setStagePayment(string calldata stage, address payeeAddress, address paymentToken, uint64 price)
        external
        onlyRole(OWNER_ROLE)
    {
        IOKXMultiMint(MULTIROUND_CONTRACT).setStagePayment(stage, payeeAddress, paymentToken, price);
    }

    /// @notice Set the upper limit of the number of mints per address for a specific round according to the stage
    /// @param stage Round identification.
    /// @param mintLimitationPerAddress Single address mint limit.
    function setStageMintLimitationPerAddress(string calldata stage, uint8 mintLimitationPerAddress)
        external
        onlyRole(OWNER_ROLE)
    {
        IOKXMultiMint(MULTIROUND_CONTRACT).setStageMintLimitationPerAddress(stage, mintLimitationPerAddress);
    }

    /// @notice Set whether server level signing is enabled for a specific round according to the stage
    /// @param stage Round identification.
    /// @param enableSig Whether to enable (true, false).
    function setStageEnableSig(string calldata stage, bool enableSig) external onlyRole(OWNER_ROLE) {
        IOKXMultiMint(MULTIROUND_CONTRACT).setStageEnableSig(stage, enableSig);
    }

    /// @notice Set a valid signer address.
    ///     If the address has been configured, it is a modify function.abi
    ///     If the address has not been configured, then it is and add function to configure the address.
    /// @param signer Signer address.
    /// @param status Effective status.
    function setActiveSigner(address signer, bool status) external onlyRole(OWNER_ROLE) {
        IOKXMultiMint(MULTIROUND_CONTRACT).setActiveSigner(signer, status);
    }

    /// @notice Set whether to restrict transfer, if configured to true, transfer is not allowed.
    ///     Otherwise, transfer is allowed.
    /// @param isTransferRestricted_ Whether to restrict transfer.
    /// @param startTime Start time.
    /// @param endTime End time.
    function setTransferRestricted(bool isTransferRestricted_, uint64 startTime, uint64 endTime)
        external
        onlyRole(OWNER_ROLE)
    {
        IOKXMultiMint(MULTIROUND_CONTRACT).setTransferRestricted(isTransferRestricted_, startTime, endTime);
    }

    /// @notice Mints a NFT for the given recipient, registers it as an IP,
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
        IOKXMultiMint.MintParams calldata mintparams
    ) external payable returns (uint256 tokenId, address ipId) {
        // register minting with OKX MultiRound, and get the remaining amount to mint
        uint256 amount =
            IOKXMultiMint(MULTIROUND_CONTRACT).eligibleCheckingAndRegister(stage, proof, signature, mintparams);

        // get stage payment information
        IOKXMultiMint.StageMintInfo memory stageMintInfo = IOKXMultiMint(MULTIROUND_CONTRACT).stageToMint(stage);
        address paymentToken = stageMintInfo.paymentToken;
        address payeeAddress = stageMintInfo.payeeAddress;
        uint256 nftPrice = stageMintInfo.price;

        if (nftPrice != 0) {
            if (paymentToken != address(0)) {
                // ERC20 token transfer
                require(
                    IERC20(paymentToken).transferFrom(msg.sender, payeeAddress, nftPrice * amount),
                    "Transfer ERC20 failed"
                );
            } else {
                // native token transfer
                require(msg.value >= nftPrice * amount, "Incorrect native payment amount");
                payable(payeeAddress).transfer(msg.value);
            }
        }

        for (uint256 i = 0; i < amount; ++i) {
            // Mint NFt to the contract itself and register it as an IP
            (tokenId, ipId) = _mintToSelf(0);

            // Transfer NFT to the recipient
            ISimpleERC721(NFT_CONTRACT).transferFrom(address(this), mintparams.to, tokenId);

            lastMintedTokenId = tokenId;
        }

        emit NFTMinted(mintparams.to, tokenId, ipId);
    }

    /// @notice Pre-Mints a NFT with specified tokenID for the given recipient, registers it as an IP,
    ///         and makes it a derivative of the organization IP.
    /// @param to The recipient of the minted NFT.
    /// @param tokenId_ The token ID of the minted NFT.
    function preMint(address to, uint256 tokenId_) external onlyRole(DEFAULT_ADMIN_ROLE) returns (address ipId) {
        require(tokenId_ != 0 && tokenId_ <= preMintedCount, "Invalid token ID");
        // increase the total minted nft
        IOKXMultiMint(MULTIROUND_CONTRACT).increaseTotalMintedAmount();

        // Mint NFt to the contract itself and register it as an IP
        uint256 tokenId = 0;
        (tokenId, ipId) = _mintToSelf(tokenId_);

        // Transfer NFT to the recipient
        ISimpleERC721(NFT_CONTRACT).transferFrom(address(this), to, tokenId_);

        emit NFTMinted(to, tokenId_, ipId);
    }

    /// @notice Enable the test mode.
    /// @param isTest_ Whether to enable the test mode.
    function enableTestMode(bool isTest_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isTest = isTest_;
    }

    //////////////////////////////////////////////////////////////////////////////////
    //                               READ FUNCTIONS                                 //
    //////////////////////////////////////////////////////////////////////////////////

    /// @notice Query the total number of minted under the current stage
    /// @param stage The stage name
    function stageToTotalSupply(string memory stage) external view returns (uint256) {
        return IOKXMultiMint(MULTIROUND_CONTRACT).stageToTotalSupply(stage);
    }

    /// @notice Query the quantity that has been minted at a certain stage at a certain address
    /// @param to Inquiry address
    /// @param stage The stage name
    function mintRecord(address to, string memory stage) external view returns (uint256) {
        return IOKXMultiMint(MULTIROUND_CONTRACT).mintRecord(to, stage);
    }

    /// @notice Query the total mint quantity
    function totalSupply() external view returns (uint256) {
        return IOKXMultiMint(MULTIROUND_CONTRACT).totalSupply();
    }

    /// @notice Query configuration information for a specific stage
    /// @param stage The stage name
    function stageToMint(string memory stage) external view returns (IOKXMultiMint.StageMintInfo memory) {
        return IOKXMultiMint(MULTIROUND_CONTRACT).stageToMint(stage);
    }

    /// @notice Query the maximum number of nfts that can be minted
    function maxSupply() external view returns (uint256) {
        return IOKXMultiMint(MULTIROUND_CONTRACT).maxSupply();
    }

    //////////////////////////////////////////////////////////////////////////////////
    //                             Internal functions                               //
    //////////////////////////////////////////////////////////////////////////////////

    function _setMaxSupply(uint256 newMaxSupply) internal {
        IOKXMultiMint(MULTIROUND_CONTRACT).setMaxSupply(newMaxSupply);
    }

    /// @notice Mints an NFT to the contract itself.
    /// @return tokenId The token ID of the minted NFT.
    /// @return ipId The IP ID of the minted NFT.
    function _mintToSelf(uint256 expectedTokenId) internal returns (uint256 tokenId, address ipId) {
        if (expectedTokenId != 0) {
            tokenId = expectedTokenId;
        } else {
            tokenId = _getRandomId();
        }

        ISimpleERC721(NFT_CONTRACT).safeMint(address(this), tokenId);

        address[] memory parentIpIds = rootNFT.ipIds;
        uint256[] memory licenseTermsIds = rootNFT.licenseTermsIds;

        if (!isTest) {
            // register IP
            ipId = _registerIp(tokenId, ipMetadataHash);

            // make derivative
            _makeDerivative(ipId, parentIpIds, PIL_TEMPLATE, licenseTermsIds, "", 0, 0, 0);
        } else {
            return (tokenId, address(0));
        }
    }

    /// @notice Get a random token ID from the remaining token IDs.
    function _getRandomId() internal returns (uint256) {
        uint256 rand =
            uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % remainingTokenIdCount;

        uint256 tokenId = remainingTokenIds[rand] == 0 ? (rand + 1) : remainingTokenIds[rand];

        // swap the last element with the selected element
        remainingTokenIds[rand] = remainingTokenIds[remainingTokenIdCount - 1] == 0
            ? remainingTokenIdCount
            : remainingTokenIds[remainingTokenIdCount - 1];

        // decrease the remaining token count
        --remainingTokenIdCount;

        return tokenId;
    }

    /// @notice Process the new pre-minted NFTs.
    /// @param count The number of pre-minted NFTs
    function _processNewPreMinted(uint256 count) internal {
        preMintedCount = count;

        // update the remaining token_id list by swapping the last elements with the pre-minted token ids
        for (uint256 i = 0; i < count; ++i) {
            remainingTokenIds[i] = remainingTokenIdCount - i;
        }

        remainingTokenIdCount -= count;
    }

    /// @notice Mints a new token and registers as an IP asset.
    /// @param tokenId The ID of the minted token.
    /// @param nftMetadataHash The hash of the metadata for the IP NFT.
    /// @return ipId The ID of the newly created IP.
    function _registerIp(uint256 tokenId, bytes32 nftMetadataHash) internal returns (address ipId) {
        ipId = IIPAssetRegistry(IP_ASSET_REGISTRY).register(block.chainid, NFT_CONTRACT, tokenId);

        // set the IP metadata if they are not empty
        if (
            keccak256(abi.encodePacked(ipMetadataURI)) != keccak256("") || ipMetadataHash != bytes32(0)
                || nftMetadataHash != bytes32(0)
        ) {
            ICoreMetadataModule(CORE_METADATA_MODULE).setAll(ipId, ipMetadataURI, ipMetadataHash, nftMetadataHash);
        }
    }

    /// @notice Register `ipId` as a derivative of `parentIpIds` under `licenseTemplate` with `licenseTermsIds`.
    /// @param ipId The ID of the IP to be registered as a derivative.
    /// @param parentIpIds The IDs of the parent IPs.
    /// @param licenseTemplate The address of the license template.
    /// @param licenseTermsIds The IDs of the license terms.
    /// @param royaltyContext The royalty context, should be empty for Royalty Policy LAP.
    /// @param maxMintingFee The maximum minting fee that the caller is willing to pay. if set to 0 then no limit.
    /// @param maxRts The maximum number of royalty tokens that can be distributed to the external royalty policies.
    /// @param maxRevenueShare The maximum revenue share percentage allowed for minting the License Tokens.
    function _makeDerivative(
        address ipId,
        address[] memory parentIpIds,
        address licenseTemplate,
        uint256[] memory licenseTermsIds,
        bytes memory royaltyContext,
        uint256 maxMintingFee,
        uint32 maxRts,
        uint32 maxRevenueShare
    ) internal {
        ILicensingModule(LICENSING_MODULE).registerDerivative({
            childIpId: ipId,
            parentIpIds: parentIpIds,
            licenseTermsIds: licenseTermsIds,
            licenseTemplate: licenseTemplate,
            royaltyContext: royaltyContext,
            maxMintingFee: maxMintingFee,
            maxRts: maxRts,
            maxRevenueShare: maxRevenueShare
        });
    }
}
