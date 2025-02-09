const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const { expect } = chai;
const { hardhat, ethers, upgrades } = require("hardhat");

const ten18 = BigInt("1000000000000000000");

describe("MimbokuMultiround contract", () => {
  let contracts = {};
  let defaultAdmin;
  let owner;
  let user1;
  let user2;
  let user3;
  let signer;

  before("Deploy contracts", async () => {
    [defaultAdmin, owner, user1, user2, user3, signer] =
      await ethers.getSigners();
    const MIMBOKU_MULTI_ROUND = await ethers.getContractFactory(
      "MimbokuMultiround"
    );
    const MIMBOKU_NFT = await ethers.getContractFactory("MimBokuNFT");
    const OKX_MULTI_MINT = await ethers.getContractFactory("OKXMultiMint");

    // deployment params
    const mimbokuMultiRound_defaultAdmin = defaultAdmin.address;
    const mimbokuMultiRound_owner = owner.address;
    const mimbokuMultiRound_templateNft = ethers.ZeroAddress;
    const mimbokuMultiRound_multiRoundContract = ethers.ZeroAddress;
    const iPMetadata = {
      rootNFT: {
        contractAddress: "0x664ad56ddb647ab6d7b436f3ea8c6f9ade201f75",
        tokenId: 1,
        ipId: "0xf77c490A4478E5d5610CD22dBC6F7182436599B7",
      },
      defaultLicenseTermsId: 1,
      pilTemplate: "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316",
      ipAssetRegistry: "0x77319B4031e6eF1250907aa00018B8B1c67a244b",
      coreMetadataModule: "0x6E81a25C99C6e8430aeC7353325EB138aFE5DC16",
      licenseModule: "0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f",
      ipMetadataURI: "",
      ipMetadataHash: ethers.ZeroHash,
    };

    contracts.mimbokuMultiRound = await upgrades.deployProxy(
      MIMBOKU_MULTI_ROUND,
      [
        mimbokuMultiRound_defaultAdmin,
        mimbokuMultiRound_owner,
        mimbokuMultiRound_templateNft,
        mimbokuMultiRound_multiRoundContract,
        iPMetadata,
      ]
    );

    contracts.mimbokuNft = await upgrades.deployProxy(MIMBOKU_NFT, [
      mimbokuMultiRound_defaultAdmin,
      contracts.mimbokuMultiRound.target,
      "Just for test",
      "JFT",
      "ipfs://tokenURI.com",
    ]);

    contracts.okxMultiMint = await upgrades.deployProxy(OKX_MULTI_MINT, [
      mimbokuMultiRound_defaultAdmin,
      contracts.mimbokuMultiRound.target,
      signer.address,
    ]);

    // re-update contracts for MimbokuMultiround
    await contracts.mimbokuMultiRound.setContracts(
      contracts.mimbokuNft.target,
      contracts.okxMultiMint.target
    );

    contracts.defaultAdmin = {
      mimbokuMultiRound: contracts.mimbokuMultiRound.connect(defaultAdmin),
      mimbokuNft: contracts.mimbokuNft.connect(defaultAdmin),
    };
    contracts.owner = {
      mimbokuMultiRound: contracts.mimbokuMultiRound.connect(owner),
    };
    contracts.user1 = {
      mimbokuMultiRound: contracts.mimbokuMultiRound.connect(user1),
    };
    contracts.user2 = {
      mimbokuMultiRound: contracts.mimbokuMultiRound.connect(user2),
    };
    contracts.user3 = {
      mimbokuMultiRound: contracts.mimbokuMultiRound.connect(user3),
    };
  });

  describe("MimbokuMultiround token information", () => {
    it("1. Show correct NFT address", async () => {
      return expect(
        await contracts.mimbokuMultiRound.NFT_CONTRACT()
      ).to.be.equal(contracts.mimbokuNft.target);
    });

    it("2. The testing flag is false", async () => {
      return expect(await contracts.mimbokuMultiRound.isTest()).to.be.equal(
        false
      );
    });

    it("3. Set testing flag to true", async () => {
      // The owner cannot set the test flag to true
      await expect(
        contracts.owner.mimbokuMultiRound.enableTestMode(true)
      ).eventually.to.be.rejectedWith("AccessControlUnauthorizedAccount");

      // The default admin can set the test flag to true
      await contracts.defaultAdmin.mimbokuMultiRound.enableTestMode(true);

      return expect(await contracts.mimbokuMultiRound.isTest()).to.be.equal(
        true
      );
    });
  });
});
