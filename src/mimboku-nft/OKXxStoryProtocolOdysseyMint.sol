// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ERC721URIStorageUpgradeable} from
    "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {BaseOrgStoryNFT} from "./BaseOrgStoryNFT.sol";
import {IOKXxStoryProtocolOdysseyMint} from "../interfaces/story-nft/IOKXxStoryProtocolOdysseyMint.sol";

contract OKXxStoryProtocolOdysseyMint is IOKXxStoryProtocolOdysseyMint, BaseOrgStoryNFT, EIP712Upgradeable {
    using MessageHashUtils for bytes32;

    bytes32 public constant MINT_AUTH_TYPE_HASH =
        keccak256("MintAuth(address to,uint256 tokenId,uint256 amount,uint256 nonce,uint256 expiry,string stage)");

    /// @notice Story Proof-of-Creativity PILicense Template address.
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address public immutable PIL_TEMPLATE;

    /// @notice Story Proof-of-Creativity default license terms ID.
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    uint256 public immutable DEFAULT_LICENSE_TERMS_ID;

    /// @dev Storage structure for the OKXxStoryProtocolOdysseyMint
    /// @param signer The signer of the whitelist signatures.
    /// @param tokenURI The base token URI for all tokens.
    /// @param ipMetadataURI The URI of the metadata for IP from this collection.
    /// @param ipMetadataHash The hash of the metadata for IP from this collection.
    /// @param nftMetadataHash The hash of the metadata for IP NFTs from this collection.
    /// @param usedSignatures Mapping of signatures to booleans indicating whether they have been used.
    /// @custom:storage-location erc7201:okx-story-protocol-odyssey.OKXxStoryProtocolOdysseyMint
    struct OKXxStoryProtocolOdysseyMintStorage {
        address signer;
        string tokenURI;
        string ipMetadataURI;
        bytes32 ipMetadataHash;
        bytes32 nftMetadataHash;
        mapping(bytes signature => bool used) usedSignatures;
        mapping(address => mapping(string => uint256)) mintRecord; //Address mint record in each stage.
        mapping(string => StageMintInfo) stageToMint; // Stage to single stage mint information.
        mapping(string => uint256) stageToTotalSupply; //Minted amount for each stage.
        uint256 maxSupply;
        address admin;
    }

    // keccak256(abi.encode(uint256(keccak256("okx-story-protocol-odyssey.OKXxStoryProtocolOdysseyMint")) - 1)) & ~bytes32(uint256(0xff));
    // ethers.keccak256(ethers.AbiCoder.encode("hex", ethers.Typed.uint256(0xb7845733ba102a68c6eb21c3cd2feafafd1130de581d7e73be60b76d775b6704)) - 1) & ~bytes32(uint256(0xff))
    bytes32 private constant OKXxStoryProtocolOdysseyMintStorageLocation =
        0x755c3306f3e340e211186877fbe8caa915fe991da8f42ee4efc19123ea0daf00;

    modifier stageExist(string calldata stage) {
        bytes memory nameBytes = bytes(_getOKXxStoryProtocolOdysseyMintStorage().stageToMint[stage].stage); // Convert string to bytes
        if (nameBytes.length == 0) {
            revert NonExistStage();
        }

        _;
    }

    modifier onlyAdminOrOwner() {
        if (msg.sender != _getOKXxStoryProtocolOdysseyMintStorage().admin && msg.sender != owner()) {
            revert InvalidAdminOrOwner();
        }
        _;
    }

    constructor(
        address derivativeWorkflows,
        address upgradeableBeacon,
        address pilTemplate,
        uint256 defaultLicenseTermsId
    ) BaseOrgStoryNFT(derivativeWorkflows, upgradeableBeacon) {
        if (derivativeWorkflows == address(0) || pilTemplate == address(0)) {
            revert OKXxStoryProtocolOdysseyMint__ZeroAddressParam();
        }

        PIL_TEMPLATE = pilTemplate;
        DEFAULT_LICENSE_TERMS_ID = defaultLicenseTermsId;

        _disableInitializers();
    }

    /**
     * @notice Mints a for the given recipient, registers it as an IP,
     *         and makes it a derivative of the organization IP.
     *
     * @param stage         Identification of the stage
     * @param signature     The signature from the whitelist signer. This signautre is genreated by having the whitelist
     * param proof         The proof for the leaf of the allowlist in a stage if mint type is Allowlist.
     * @param mintparams    The mint parameter
     * signer sign the caller's address (msg.sender) for this `mint` function.
     * @return tokenId The token ID of the minted NFT.
     * @return ipId The ID of the NFT IP.
     */
    function mint(
        string calldata stage,
        bytes calldata signature,
        bytes32[] calldata, /*proof*/
        MintParams calldata mintparams
    ) external returns (uint256 tokenId, address ipId) {
        OKXxStoryProtocolOdysseyMintStorage storage $ = _getOKXxStoryProtocolOdysseyMintStorage();
        StageMintInfo memory stageMintInfo = $.stageToMint[stage];
        address to = mintparams.to;
        uint256 amount = mintparams.amount;

        if (stageMintInfo.enableSig) {
            uint256 expiry = mintparams.expiry;
            // The given signature must not have been used
            if ($.usedSignatures[signature]) revert OKXxStoryProtocolOdysseyMint__SignatureAlreadyUsed();

            if (block.timestamp > expiry) revert ExpiredSignature();

            // Mark the signature as used
            $.usedSignatures[signature] = true;

            // The given signature must be valid
            bytes32 digest;
            {
                bytes32 stageByte32 = keccak256(bytes(stage));
                digest = keccak256(
                    abi.encode(
                        MINT_AUTH_TYPE_HASH, to, mintparams.tokenId, amount, mintparams.nonce, expiry, stageByte32
                    )
                );
            }

            address recoveredSigner = ECDSA.recover(_hashTypedDataV4(digest), signature);
            if (recoveredSigner != $.signer) revert OKXxStoryProtocolOdysseyMint__InvalidSignature();
        }

        // Ensure that the mint stage status.
        _validateActive(stageMintInfo.startTime, stageMintInfo.endTime);

        //validate mint amount
        {
            uint256 mintedAmount = $.mintRecord[to][stage];
            uint256 stageSupply = $.stageToTotalSupply[stage];
            _validateAmount(
                $,
                amount,
                mintedAmount,
                stageMintInfo.limitationForAddress,
                stageMintInfo.maxSupplyForStage,
                stageSupply
            );
        }

        for (uint256 i = 0; i < amount; ++i) {
            (tokenId, ipId) = _mintToSelf();

            // Transfer the to the recipient
            _transfer(address(this), to, tokenId);
        }
        $.mintRecord[to][stage] += amount;
        $.stageToTotalSupply[stage] += amount;

        emit OKXxStoryProtocolOdysseyMintMinted(to, tokenId, ipId);
    }

    /// @notice Updates the whitelist signer.
    /// @param signer_ The new whitelist signer address.
    function setSigner(address signer_) external onlyAdminOrOwner {
        _getOKXxStoryProtocolOdysseyMintStorage().signer = signer_;
        emit OKXxStoryProtocolOdysseyMintSignerUpdated(signer_);
    }

    /// @notice Updates the unified token URI for all s.
    /// @param tokenURI_ The new token URI.
    function setTokenURI(string memory tokenURI_) external onlyAdminOrOwner {
        _getOKXxStoryProtocolOdysseyMintStorage().tokenURI = tokenURI_;
        emit BatchMetadataUpdate(0, totalSupply());
    }

    /// @notice Returns the token URI for the given token ID.
    /// @param tokenId The token ID.
    /// @return The unified token URI for all s.
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721URIStorageUpgradeable, IERC721Metadata)
        returns (string memory)
    {
        string memory baseURI = _getOKXxStoryProtocolOdysseyMintStorage().tokenURI;
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, _toString(tokenId))) : "";
    }

    function signer() external view returns (address) {
        return _getOKXxStoryProtocolOdysseyMintStorage().signer;
    }

    function mintRecord(address user, string memory stage) external view returns (uint256) {
        return _getOKXxStoryProtocolOdysseyMintStorage().mintRecord[user][stage];
    }

    function maxSupply() external view returns (uint256) {
        return _getOKXxStoryProtocolOdysseyMintStorage().maxSupply;
    }

    function stageToMint(string memory stage) external view returns (StageMintInfo memory) {
        return _getOKXxStoryProtocolOdysseyMintStorage().stageToMint[stage];
    }

    function stageToTotalSupply(string memory stage) external view returns (uint256) {
        return _getOKXxStoryProtocolOdysseyMintStorage().stageToTotalSupply[stage];
    }

    function setAdmin(address admin) external onlyAdminOrOwner {
        if (admin == address(0)) {
            revert InvalidConfig();
        }

        _getOKXxStoryProtocolOdysseyMintStorage().admin = admin;
        emit AdminSet(admin);
    }

    function setStageMintInfo(StageMintInfo calldata stageMintInfo) external onlyAdminOrOwner {
        string memory stage = stageMintInfo.stage;

        _stageNonExist(stage);

        _getOKXxStoryProtocolOdysseyMintStorage().stageToMint[stage] = stageMintInfo;

        emit StageMintInfoSet(stageMintInfo);
    }

    function setStageMintTime(string calldata stage, uint64 startTime, uint64 endTime)
        external
        onlyAdminOrOwner
        stageExist(stage)
    {
        OKXxStoryProtocolOdysseyMintStorage storage $ = _getOKXxStoryProtocolOdysseyMintStorage();

        $.stageToMint[stage].startTime = startTime;
        $.stageToMint[stage].endTime = endTime;

        emit StageMintTimeSet(stage, startTime, endTime);
    }

    function setStageMintLimitationPerAddress(string calldata stage, uint8 mintLimitationPerAddress)
        external
        onlyAdminOrOwner
        stageExist(stage)
    {
        _getOKXxStoryProtocolOdysseyMintStorage().stageToMint[stage].limitationForAddress = mintLimitationPerAddress;

        emit StageMintLimitationPerAddressSet(stage, mintLimitationPerAddress);
    }

    function setStageMaxSupply(string calldata stage, uint32 stageMaxSupply)
        external
        onlyAdminOrOwner
        stageExist(stage)
    {
        OKXxStoryProtocolOdysseyMintStorage storage $ = _getOKXxStoryProtocolOdysseyMintStorage();
        //new total stage supply that be configure
        if (stageMaxSupply > $.maxSupply || stageMaxSupply <= totalSupply()) {
            revert InvalidStageMaxSupply();
        }

        $.stageToMint[stage].maxSupplyForStage = stageMaxSupply;

        emit StageMaxSupplySet(stage, stageMaxSupply);
    }

    function setMaxSupply(uint32 newMaxSupply) external onlyAdminOrOwner {
        if (newMaxSupply < totalSupply()) {
            revert InvalidMaxSupply();
        }
        _getOKXxStoryProtocolOdysseyMintStorage().maxSupply = newMaxSupply;
        emit MaxSupplySet(newMaxSupply);
    }

    function setStageEnableSig(string calldata stage, bool enableSig) external onlyAdminOrOwner stageExist(stage) {
        _getOKXxStoryProtocolOdysseyMintStorage().stageToMint[stage].enableSig = enableSig;

        emit StageEnableSigSet(stage, enableSig);
    }

    function baseUri() external view returns (string memory) {
        return _getOKXxStoryProtocolOdysseyMintStorage().tokenURI;
    }

    /// @notice Initializes the OKXxStoryProtocolOdysseyMint with custom data (see {IOKXxStoryProtocolOdysseyMint-CustomInitParams}).
    /// @dev This function is called by BaseStoryNFT's `initialize` function.
    /// @param customInitData The custom data to initialize the OKXxStoryProtocolOdysseyMint.
    function _customize(bytes memory customInitData) internal override onlyInitializing {
        CustomInitParams memory customParams = abi.decode(customInitData, (CustomInitParams));
        if (customParams.signer == address(0)) revert OKXxStoryProtocolOdysseyMint__ZeroAddressParam();

        OKXxStoryProtocolOdysseyMintStorage storage $ = _getOKXxStoryProtocolOdysseyMintStorage();
        $.tokenURI = customParams.tokenURI;
        $.signer = customParams.signer;
        $.ipMetadataURI = customParams.ipMetadataURI;
        $.ipMetadataHash = customParams.ipMetadataHash;
        $.nftMetadataHash = customParams.nftMetadataHash;

        __EIP712_init("OKXMint", "1.0");
    }

    function _validateAmount(
        OKXxStoryProtocolOdysseyMintStorage storage $,
        uint256 amount,
        uint256 mintedAmount,
        uint256 mintLimitationPerAddress,
        uint256 maxSupplyForStage,
        uint256 stageTotalSupply
    ) internal view {
        //check per address mint limitation
        if (mintedAmount + amount > mintLimitationPerAddress) {
            revert ExceedPerAddressLimit();
        }

        //check stage mint maxsupply
        if (maxSupplyForStage > 0 && stageTotalSupply + amount > maxSupplyForStage) {
            revert ExceedMaxSupplyForStage();
        }

        //check total maxSupply
        if (totalSupply() + amount > $.maxSupply) {
            revert ExceedMaxSupply();
        }
    }

    function _validateActive(uint256 startTime, uint256 endTime) internal view {
        if (_cast(block.timestamp < startTime) | _cast(block.timestamp > endTime) == 1) {
            // Revert if the stage is not active.
            revert NotActive();
        }
    }

    function _stageNonExist(string memory stage) internal view {
        OKXxStoryProtocolOdysseyMintStorage storage $ = _getOKXxStoryProtocolOdysseyMintStorage();

        bytes memory nameBytes = bytes($.stageToMint[stage].stage); // Convert string to bytes
        if (nameBytes.length != 0) {
            revert ExistStage();
        }
    }

    /**
     * @dev Converts a `uint256` to its ASCII `string` decimal representation.
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        // Inspired by OraclizeAPI's implementation - MIT licence
        // https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol

        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _cast(bool b) internal pure returns (uint256 u) {
        assembly {
            u := b
        }
    }

    /// @notice Mints an NFT to the contract itself.
    /// @return tokenId The token ID of the minted NFT.
    /// @return ipId The IP ID of the minted NFT.
    function _mintToSelf() internal returns (uint256 tokenId, address ipId) {
        OKXxStoryProtocolOdysseyMintStorage storage $ = _getOKXxStoryProtocolOdysseyMintStorage();

        address[] memory parentIpIds = new address[](1);
        uint256[] memory licenseTermsIds = new uint256[](1);
        parentIpIds[0] = orgIpId();
        licenseTermsIds[0] = DEFAULT_LICENSE_TERMS_ID;

        // Mint the and register it as an IP
        (tokenId, ipId) = _mintAndRegisterIpAndMakeDerivative(
            address(this),
            $.tokenURI,
            $.ipMetadataURI,
            $.ipMetadataHash,
            $.nftMetadataHash,
            parentIpIds,
            PIL_TEMPLATE,
            licenseTermsIds,
            ""
        );
    }

    /// @dev Returns the storage struct of OKXxStoryProtocolOdysseyMint.
    function _getOKXxStoryProtocolOdysseyMintStorage()
        private
        pure
        returns (OKXxStoryProtocolOdysseyMintStorage storage $)
    {
        assembly {
            $.slot := OKXxStoryProtocolOdysseyMintStorageLocation
        }
    }
}
