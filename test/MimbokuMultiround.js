const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const { expect } = chai;
const { hre, ethers, upgrades } = require("hardhat");

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
    //      MIMBOKU_MULTI_ROUND.deployProxy(
    //   mimbokuMultiRound_defaultAdmin,
    //   mimbokuMultiRound_owner,
    //   mimbokuMultiRound_templateNft,
    //   mimbokuMultiRound_multiRoundContract,
    //   iPMetadata
    // );
    contracts.mimbokuNft = await MIMBOKU_NFT.deployProxy(
      mimbokuMultiRound_defaultAdmin,
      contracts.mimbokuMultiRound.address,
      "Just for test",
      "JFT",
      "ipfs://tokenURI.com"
    );
    contracts.okxMultiMint = await OKX_MULTI_MINT.deployProxy(
      mimbokuMultiRound_defaultAdmin,
      contracts.mimbokuMultiRound.address,
      signer
    );

    // re-update contracts for MimbokuMultiround
    await contracts.mimbokuMultiRound.setContracts(
      contracts.mimbokuNft.address,
      contracts.okxMultiMint.address
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
      ).to.be.equal(contracts.mimbokuNft.address);
    });
  });

  //   describe("Mint and transfer SFT", () => {
  //     it("1. All token belong to owner", async () => {
  //       const mintedAmount = BigInt("10000000000") * ten18;

  //       const ownerBalance = await contracts.shf.balanceOf(owner.address);

  //       return expect(ownerBalance).to.be.equal(mintedAmount);
  //     });

  //     it("2. Transfer token from owner to address susccess", async () => {
  //       const transferAmount = BigInt("5000") * ten18;

  //       await contracts.shf.transfer(user1.address, transferAmount);

  //       const balance = await contracts.shf.balanceOf(user1.address);

  //       return expect(transferAmount).to.be.equal(balance);
  //     });

  //     it("3. Cannot transfer token from user to another user", async () => {
  //       const transferAmount = BigInt("2000") * ten18;

  //       return expect(
  //         contracts.user1.shf.transfer(user2.address, transferAmount)
  //       ).eventually.to.be.rejectedWith(
  //         "ShibaFriend: sender or receiver not allowed"
  //       );
  //     });
  //   });

  //   describe("Config and transer from user to contract", () => {
  //     it("1. Cannot config allow send or receive address because not admin", async () => {
  //       expect(contracts.user1.shf.allowReceiveAddress(user2.address)).eventually
  //         .to.be.rejected;

  //       return expect(contracts.user1.shf.allowSendAddress(user2.address))
  //         .eventually.to.be.rejected;
  //     });

  //     it("2. User cannot send or receive because unauthorized", async () => {
  //       const transferAmount = BigInt("500") * ten18;

  //       return expect(contracts.user2.shf.transfer(user3.address, transferAmount))
  //         .eventually.to.be.rejected;
  //     });
  //   });

  //   describe("A normal token contract with blacklisted", () => {
  //     it("0. Allow wallets transfer", async () => {
  //       await contracts.owner.shf.allowWalletTransfer();
  //     });

  //     it("1. Wallets can transfer normally", async () => {
  //       const transferAmountBig = BigInt("300000") * ten18;

  //       expect(
  //         contracts.user1.shf.transfer(user2.address, transferAmountBig)
  //       ).eventually.to.be.rejectedWith("ERC20: transfer amount exceeds balance");

  //       const transferAmount1 = BigInt("3000") * ten18;

  //       await contracts.user1.shf.transfer(user2.address, transferAmount1);

  //       const balance1 = await contracts.shf.balanceOf(user2.address);

  //       expect(transferAmount1).to.be.equal(balance1);

  //       const transferAmount2 = BigInt("1000") * ten18;

  //       await contracts.user2.shf.transfer(user3.address, transferAmount2);

  //       const balance2 = await contracts.shf.balanceOf(user3.address);

  //       return expect(transferAmount2).to.be.equal(balance2);
  //     });

  //     it("2. Admin can blacklisted a wallet", async () => {
  //       const balanceUser2 = await contracts.shf.balanceOf(user2.address);

  //       expect(balanceUser2).to.be.equal(BigInt("2000") * ten18);

  //       await contracts.owner.shf.blacklistAddress(user2.address);

  //       const balanceUser2After = await contracts.shf.balanceOf(user2.address);

  //       expect(balanceUser2After).to.be.equal(BigInt("0") * ten18);

  //       const transferAmount2 = BigInt("1000") * ten18;

  //       const blackListed = await contracts.owner.shf.getBlackListedAddress();

  //       expect(blackListed[0]).to.be.equal(user2.address);

  //       return expect(
  //         contracts.user2.shf.transfer(user3.address, transferAmount2)
  //       ).eventually.to.be.rejectedWith(
  //         "ShibaFriend: sender or receiver is blacklisted"
  //       );
  //     });

  //     it("3. Admin can unblacklisted a wallet", async () => {
  //       await contracts.owner.shf.unBlacklistAddress(user2.address);

  //       const balanceUser2 = await contracts.shf.balanceOf(user2.address);

  //       expect(balanceUser2).to.be.equal(BigInt("2000") * ten18);

  //       const blackListed = await contracts.owner.shf.getBlackListedAddress();

  //       let length = blackListed.length;

  //       expect(length).to.be.equal(0);

  //       const transferAmount2 = BigInt("1000") * ten18;

  //       await contracts.user2.shf.transfer(user3.address, transferAmount2);

  //       const balance2 = await contracts.shf.balanceOf(user3.address);

  //       return expect(balance2).to.be.equal(BigInt("2000") * ten18);
  //     });
  //   });
});
