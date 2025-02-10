# okx-story-nft

This is the repository for NFT multiMint of the OKX x Mimboku on Story protocol network.
_Note_: This version is suitable for [@story-protocol/story-core v1.3.1](https://github.com/storyprotocol/protocol-core-v1/commit/a0cddb1d712566a550fcaca2f8df1f4f67f095ad) and works on the [Story Mainnet](https://chainlist.org/chain/1514).

## Deployed contracts

To be easy to use, we have deployed the contract on the Story mainnet for testing. You can check the contract at the following address:
| Contract | Address |
|-------------------|--------------------------------------------|
| MimBokuNFT | [0xeCa078CbD29D0CD125a7b410952177692c9D9A0a](https://kmnzxolweu42.blockscout.com/token/0xeCa078CbD29D0CD125a7b410952177692c9D9A0a) |
| MimbokuMultiround | [0x8345448b890985baa74b86c167352ee0e31a8327](https://kmnzxolweu42.blockscout.com/address/0x8345448b890985baa74b86c167352ee0e31a8327) |

## Installation requirements

Require install Hardhat and Node.js before running the project. After that, you can install the project by running the following command:

```bash
yarn
```

## For testing

To run the test, you can run the following command:

```bash
npx hardhat test
```

## For deploying

To deploy the contract, you must do the following steps:

1. Copy `.secret.example` to `.secret` and fill in the private key of the wallet you want to be deployer.
2. Change the `network` in `hardhat.config.js` to the network you want to deploy. In this project, we have added the information of the [Story Odyssey Testnet](https://chainlist.org/chain/1516), [Story Aeneid Testnet](https://chainlist.org/chain/1315), and [Story Mainnet](https://chainlist.org/chain/1514).
3. Run the following command to deploy the contract:

```bash
npx hardhat deploy --network <network>
```

## Contract description

### MimBokuNFT

This is the contract for NFT collection. It is inherited from the ERC721 and ERC2981 contract. The contract has the following main functions:

```solidity
    /// @notice Mint a new NFT with a given tokenURI to the given address
    function safeMint(address to, uint256 tokenId) public onlyRole(MINTER_ROLE);

    /// @notice Change the baseURI of the contract
    function setTokenURI(string calldata baseURI_) public onlyRole(DEFAULT_ADMIN_ROLE);

    /// @notice Change the default royalty receiver and royalty fraction of the contract
    function setDefaultRoyalty(address receiver, uint96 royaltyFraction) public onlyRole(DEFAULT_ADMIN_ROLE);

    /// @notice Change the royalty receiver and royalty fraction of the given tokenId
    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 royaltyFraction) public onlyRole(DEFAULT_ADMIN_ROLE);

    /// @notice Transfer the given tokenId to the given address from the given address
    function transferFrom(address from, address to, uint256 tokenId) external;
```

For the other functions, you can check the contract at: [MimBokuNFT.sol](contracts/MimBokuNFT.sol)

### MimbokuMultiround

This is the main contract of project. It allows admin configure the minting round and let users mint the NFT.

Each round has the following information:

```solidity
    /**
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
    * @param mintType                 Mint type. (Public = 0, Allowlist = 1)
    */
```

The contract has the following main functions:

```solidity
    /// @notice Updates the whitelist signer.
    /// @param signer_ The new whitelist signer address.
    function setSigner(address signer_) external;

    /// @notice Configure or update the maximum number of nfts that can be minted.
    /// @param newMaxSupply The new maximum number of nfts that can be minted.
    function setMaxSupply(uint256 newMaxSupply) external;

    /// @notice Configure or update the information of a certain round according to the stage
    /// @param stageMintInfo The mint information for the stage.
    function setStageMintInfo(IOKXMultiMint.StageMintInfo calldata stageMintInfo) external;

    /// @notice Configure or update the mint time for a specific stage.
    /// @param stage Round identification.
    /// @param startTime The start time of the stage.
    /// @param endTime The end time of the stage.
    function setStageMintTime(string calldata stage, uint64 startTime, uint64 endTime) external;

    /// @notice According to the stage, set the maximum nft supply for a specific round.
    /// @param stage Round identification.
    /// @param maxSupply nft maximum supply.
    function setStageMaxSupply(string calldata stage, uint32 maxSupply) external;

    /// @notice Set payment information for a specific round based on the stage
    /// @param stage Round identification.
    /// @param payeeAddress Payment address.
    /// @param paymentToken Token contract address for payment (if 0, it is a native token).
    /// @param price Single nft price.
    function setStagePayment(string calldata stage, address payeeAddress, address paymentToken, uint64 price)
        external;

    /// @notice Set the upper limit of the number of mints per address for a specific round according to the stage
    /// @param stage Round identification.
    /// @param mintLimitationPerAddress Single address mint limit.
    function setStageMintLimitationPerAddress(string calldata stage, uint8 mintLimitationPerAddress) external;

    /// @notice Set whether server level signing is enabled for a specific round according to the stage
    /// @param stage Round identification.
    /// @param enableSig Whether to enable (true, false).
    function setStageEnableSig(string calldata stage, bool enableSig) external;

    /// @notice Set a valid signer address.
    ///     If the address has been configured, it is a modify function.abi
    ///     If the address has not been configured, then it is and add function to configure the address.
    /// @param signer Signer address.
    /// @param status Effective status.
    function setActiveSigner(address signer, bool status) external;

    /// @notice Set whether to restrict transfer, if configured to true, transfer is not allowed.
    ///     Otherwise, transfer is allowed.
    /// @param isTransferRestricted_ Whether to restrict transfer.
    /// @param startTime Start time.
    /// @param endTime End time.
    function setTransferRestricted(bool isTransferRestricted_, uint64 startTime, uint64 endTime) external;

    /// @notice Mints a NFT for the given recipient, registers it as an IP,
    ///         and makes it a derivative of the organization IP.
    /// @param stage         Identification of the stage
    /// @param signature     The signature from the whitelist signer. This signautre is genreated by having the whitelist
    /// the 3rd param, proof, is the proof for the leaf of the allowlist in a stage if mint type is Allowlist.
    /// @param mintparams    The mint parameter
    /// signer sign the caller's address (msg.sender) for this `mint` function.
    /// @return tokenId The token ID of the minted NFT.
    /// @return ipId The ID of the NFT IP.
    function mint(
        string calldata stage,
        bytes calldata signature,
        bytes32[] calldata proof,
        IOKXMultiMint.MintParams calldata mintparams
    ) external payable returns (uint256 tokenId, address ipId);

    /// @notice Query the total number of minted under the current stage
    /// @param stage The stage name
    function stageToTotalSupply(string memory stage) external view returns (uint256);

    /// @notice Query the quantity that has been minted at a certain stage at a certain address
    /// @param to Inquiry address
    /// @param stage The stage name
    function mintRecord(address to, string memory stage) external view returns (uint256);

    /// @notice Query the total mint quantity
    function totalSupply() external view returns (uint256);

    /// @notice Query configuration information for a specific stage
    /// @param stage The stage name
    function stageToMint(string memory stage) external view returns (IOKXMultiMint.StageMintInfo memory);
```
