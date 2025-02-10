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
  let publicUser;
  let signer;

  const stageName_1 = "Whitelist";
  const stageName_2 = "Public";

  const stagePrice1 = 9999;
  const stagePrice2 = 100;

  const premintedAmount = 20;

  let proofUser1;
  let proofUser2;
  let proofUser3;

  let tokenIDs = [];

  before("Deploy contracts", async () => {
    [defaultAdmin, owner, user1, user2, user3, publicUser, signer] =
      await ethers.getSigners();

    // User1:  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
    // "leaf": "0x0x8a3552d60a98e0ade765adddad0a2e420ca9b1eef5f326ba7ab860bb4ea72c94",
    proofUser1 = [
      "0x1ebaa930b8e9130423c183bf38b0564b0103180b7dad301013b18e59880541ae",
      "0xf4ca8532861558e29f9858a3804245bb30f0303cc71e4192e41546237b6ce58b",
    ];

    // User2:  0x90F79bf6EB2c4f870365E785982E1f101E93b906
    // "leaf": "0x0x1ebaa930b8e9130423c183bf38b0564b0103180b7dad301013b18e59880541ae",
    proofUser2 = [
      "0x8a3552d60a98e0ade765adddad0a2e420ca9b1eef5f326ba7ab860bb4ea72c94",
      "0xf4ca8532861558e29f9858a3804245bb30f0303cc71e4192e41546237b6ce58b",
    ];

    // User3:  0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
    // "leaf": "0x0xf4ca8532861558e29f9858a3804245bb30f0303cc71e4192e41546237b6ce58b",
    proofUser3 = [
      "0x7e0eefeb2d8740528b8f598997a219669f0842302d3c573e9bb7262be3387e63",
    ];

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
    contracts.publicUser = {
      mimbokuMultiRound: contracts.mimbokuMultiRound.connect(publicUser),
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

    it("4. Add new round", async () => {
      // get max supply
      const preMaxSupply = await contracts.mimbokuMultiRound.maxSupply();
      expect(preMaxSupply).to.be.equal(0);

      const stageMintInfo = {
        enableSig: 0,
        limitationForAddress: 50,
        maxSupplyForStage: 100,
        startTime: Math.floor((Date.now() + 5 * 60 * 1000) / 1000), // 5 minutes later
        endTime: Math.floor((Date.now() + 30 * 60 * 1000) / 1000), // 30 minutes later
        price: stagePrice1,
        paymentToken: ethers.ZeroAddress,
        payeeAddress: defaultAdmin.address,
        allowListMerkleRoot:
          "0x1d2c6d0de38c77d2a15f6d241121ec032404625e87566d8a742d3dc2f924263d",
        stage: stageName_1,
        mintType: 1,
      };

      await contracts.owner.mimbokuMultiRound.setStageMintInfo(stageMintInfo);

      // get round info
      const roundInfo = await contracts.mimbokuMultiRound.stageToMint(
        stageName_1
      );

      // check round info
      expect(roundInfo.enableSig).to.be.equal(false);
      expect(roundInfo.limitationForAddress).to.be.equal(
        stageMintInfo.limitationForAddress
      );
      expect(roundInfo.maxSupplyForStage).to.be.equal(
        stageMintInfo.maxSupplyForStage
      );
      expect(roundInfo.startTime).to.be.equal(stageMintInfo.startTime);
      expect(roundInfo.endTime).to.be.equal(stageMintInfo.endTime);
      expect(roundInfo.price).to.be.equal(stageMintInfo.price);
      expect(roundInfo.paymentToken).to.be.equal(stageMintInfo.paymentToken);
      expect(roundInfo.payeeAddress).to.be.equal(stageMintInfo.payeeAddress);
      expect(roundInfo.allowListMerkleRoot).to.be.equal(
        stageMintInfo.allowListMerkleRoot
      );
      expect(roundInfo.stage).to.be.equal(stageMintInfo.stage);
      expect(roundInfo.mintType).to.be.equal(stageMintInfo.mintType);

      // get max supply
      const maxSupply = await contracts.mimbokuMultiRound.maxSupply();
      return expect(maxSupply).to.be.equal(stageMintInfo.maxSupplyForStage);
    });

    it("5. Add other round", async () => {
      // get max supply
      const preMaxSupply = await contracts.mimbokuMultiRound.maxSupply();
      expect(preMaxSupply).to.be.equal(100);

      const stageMintInfo = {
        enableSig: 0,
        limitationForAddress: 200,
        maxSupplyForStage: 200,
        startTime: Math.floor((Date.now() + 31 * 60 * 1000) / 1000), // 31 minutes later
        endTime: Math.floor((Date.now() + 60 * 60 * 1000) / 1000), // 1 hour later
        price: stagePrice2,
        paymentToken: ethers.ZeroAddress,
        payeeAddress: defaultAdmin.address,
        allowListMerkleRoot:
          "0x48d4b355d04495ff5eef1f1f6a4d0ae1e999e125f180fe304123ba94c98f98a1",
        stage: stageName_2,
        mintType: 0,
      };

      await contracts.owner.mimbokuMultiRound.setStageMintInfo(stageMintInfo);

      // get round info
      const roundInfo = await contracts.mimbokuMultiRound.stageToMint(
        stageName_2
      );

      // check round info
      expect(roundInfo.enableSig).to.be.equal(false);
      expect(roundInfo.limitationForAddress).to.be.equal(
        stageMintInfo.limitationForAddress
      );
      expect(roundInfo.maxSupplyForStage).to.be.equal(
        stageMintInfo.maxSupplyForStage
      );
      expect(roundInfo.startTime).to.be.equal(stageMintInfo.startTime);
      expect(roundInfo.endTime).to.be.equal(stageMintInfo.endTime);
      expect(roundInfo.price).to.be.equal(stageMintInfo.price);
      expect(roundInfo.paymentToken).to.be.equal(stageMintInfo.paymentToken);
      expect(roundInfo.payeeAddress).to.be.equal(stageMintInfo.payeeAddress);
      expect(roundInfo.allowListMerkleRoot).to.be.equal(
        stageMintInfo.allowListMerkleRoot
      );
      expect(roundInfo.stage).to.be.equal(stageMintInfo.stage);
      expect(roundInfo.mintType).to.be.equal(stageMintInfo.mintType);

      // get max supply
      const maxSupply = await contracts.mimbokuMultiRound.maxSupply();
      return expect(maxSupply).to.be.equal(300);
    });

    it("6. Set pre-minted NFTs amount", async () => {
      // get max supply
      const preMaxSupply = await contracts.mimbokuMultiRound.maxSupply();
      expect(preMaxSupply).to.be.equal(300);

      const preMintedAmountTemp = 11;
      await contracts.owner.mimbokuMultiRound.setPreMintedCount(
        preMintedAmountTemp
      );

      expect(await contracts.mimbokuMultiRound.preMintedCount()).to.be.equal(
        preMintedAmountTemp
      );
      return expect(await contracts.mimbokuMultiRound.maxSupply()).to.be.equal(
        311
      );
    });

    it("7. Set pre-minted NFTs amount again", async () => {
      // get max supply
      const preMaxSupply = await contracts.mimbokuMultiRound.maxSupply();
      expect(preMaxSupply).to.be.equal(311);

      const preMintedAmountTemp = premintedAmount;
      await contracts.owner.mimbokuMultiRound.setPreMintedCount(
        preMintedAmountTemp
      );

      expect(await contracts.mimbokuMultiRound.preMintedCount()).to.be.equal(
        preMintedAmountTemp
      );
      return expect(await contracts.mimbokuMultiRound.maxSupply()).to.be.equal(
        320
      );
    });

    it("8. Cannot mint a NFT when round is not started", async () => {
      // get total supply
      const preTotalSupply = await contracts.mimbokuMultiRound.totalSupply();
      expect(preTotalSupply).to.be.equal(0);

      // mint a NFT to user1
      const toAddress = user1.address;
      const stageName = stageName_1;
      const signature = "0x";
      const proof = proofUser1;
      const mintparams = {
        amount: 1,
        tokenId: 1,
        nonce: 1,
        expiry: 1,
        to: toAddress,
      };

      return expect(
        contracts.user1.mimbokuMultiRound.mint(
          stageName,
          signature,
          proof,
          mintparams
        )
      ).to.be.rejectedWith("NotActive()");
    });

    it("9. Can mint a NFT when round is started", async () => {
      // get total supply
      const preTotalSupply = await contracts.mimbokuMultiRound.totalSupply();
      expect(preTotalSupply).to.be.equal(0);

      // get balance of payee before mint
      const balanceBeforeMintPayee = await ethers.provider.getBalance(
        defaultAdmin.address
      );

      // mint a NFT to user1
      const toAddress = user1.address;
      const stageName = stageName_1;
      const signature = "0x";
      const proof = proofUser1;
      const mintparams = {
        amount: 1,
        tokenId: 1,
        nonce: 1,
        expiry: 1,
        to: toAddress,
      };

      // increase time to start round
      await ethers.provider.send("evm_increaseTime", [5 * 60 + 1]);

      // mint a NFT with value of 9999
      await contracts.user1.mimbokuMultiRound.mint(
        stageName,
        signature,
        proof,
        mintparams,
        { value: stagePrice1 }
      );

      // get balance of user1 after mint
      const balanceAfterMintUser1 = await ethers.provider.getBalance(
        user1.address
      );
      // get balance of payee after mint
      const balanceAfterMintPayee = await ethers.provider.getBalance(
        defaultAdmin.address
      );

      // check balance of payee
      expect(balanceAfterMintPayee).to.be.equal(
        BigInt(balanceBeforeMintPayee) + BigInt(stagePrice1)
      );

      // query last minted token ID
      const tokenID = await contracts.mimbokuMultiRound.lastMintedTokenId();

      console.log("Token ID: ", tokenID.toString());

      // get total supply
      const totalSupply = await contracts.mimbokuMultiRound.totalSupply();
      expect(totalSupply).to.be.equal(1);

      // get owner of NFT
      const ownerOfNFT = await contracts.mimbokuNft.ownerOf(tokenID);
      return expect(ownerOfNFT).to.be.equal(toAddress);
    });

    it("10. Mint 49 NFTs to user1", async () => {
      // get total supply
      const preTotalSupply = await contracts.mimbokuMultiRound.totalSupply();
      expect(preTotalSupply).to.be.equal(1);

      // get balance of payee before mint
      const balanceBeforeMintPayee = await ethers.provider.getBalance(
        defaultAdmin.address
      );

      // loop to mint 49 NFTs to user1
      for (let i = 2; i <= 50; i++) {
        // mint a NFT to user1
        const toAddress = user1.address;
        const stageName = stageName_1;
        const signature = "0x";
        const mintparams = {
          amount: 1,
          tokenId: i,
          nonce: i,
          expiry: i,
          to: toAddress,
        };

        // mint a NFT with value of 9999
        await contracts.user1.mimbokuMultiRound.mint(
          stageName,
          signature,
          proofUser1,
          mintparams,
          { value: stagePrice1 }
        );

        // query last minted token ID
        const tokenID = await contracts.mimbokuMultiRound.lastMintedTokenId();

        expect(tokenID).to.be.greaterThan(premintedAmount);

        tokenIDs.push(tokenID);
      }

      // get balance of user1 after mint
      const balanceAfterMintUser1 = await ethers.provider.getBalance(
        user1.address
      );
      // get balance of payee after mint
      const balanceAfterMintPayee = await ethers.provider.getBalance(
        defaultAdmin.address
      );

      // check balance of payee
      expect(balanceAfterMintPayee).to.be.equal(
        BigInt(balanceBeforeMintPayee) + BigInt(stagePrice1 * 49)
      );

      // Mint 1 more NFT to user1
      const toAddress = user1.address;
      const stageName = stageName_1;
      const signature = "0x";
      const mintparams = {
        amount: 1,
        tokenId: 51,
        nonce: 51,
        expiry: 51,
        to: toAddress,
      };

      // mint a NFT with value of 9999
      return expect(
        contracts.user1.mimbokuMultiRound.mint(
          stageName,
          signature,
          proofUser1,
          mintparams,
          { value: stagePrice1 }
        )
      ).to.be.rejectedWith("ExceedPerAddressLimit()");
    });

    it("11. Mint 50 NFTs to user3", async () => {
      // get total supply
      const preTotalSupply = await contracts.mimbokuMultiRound.totalSupply();
      expect(preTotalSupply).to.be.equal(50);

      // get balance of payee before mint
      const balanceBeforeMintPayee = await ethers.provider.getBalance(
        defaultAdmin.address
      );

      // loop to mint 50 NFTs to user3
      for (let i = 51; i <= 100; i++) {
        // mint a NFT to user3
        const toAddress = user3.address;
        const stageName = stageName_1;
        const signature = "0x";
        const mintparams = {
          amount: 1,
          tokenId: i,
          nonce: i,
          expiry: i,
          to: toAddress,
        };

        // mint a NFT with value of 9999
        await contracts.user3.mimbokuMultiRound.mint(
          stageName,
          signature,
          proofUser3,
          mintparams,
          { value: stagePrice1 }
        );

        // query last minted token ID
        const tokenID = await contracts.mimbokuMultiRound.lastMintedTokenId();

        expect(tokenID).to.be.greaterThan(premintedAmount);

        tokenIDs.push(tokenID);
      }

      // get balance of user3 after mint
      const balanceAfterMintUser3 = await ethers.provider.getBalance(
        user3.address
      );
      // get balance of payee after mint
      const balanceAfterMintPayee = await ethers.provider.getBalance(
        defaultAdmin.address
      );

      // check balance of payee
      expect(balanceAfterMintPayee).to.be.equal(
        BigInt(balanceBeforeMintPayee) + BigInt(stagePrice1 * 50)
      );

      // Mint 1 more NFT to user3
      const toAddress = user3.address;
      const stageName = stageName_1;
      const signature = "0x";
      const mintparams = {
        amount: 1,
        tokenId: 101,
        nonce: 101,
        expiry: 101,
        to: toAddress,
      };

      // mint a NFT with value of 9999
      return expect(
        contracts.user3.mimbokuMultiRound.mint(
          stageName,
          signature,
          proofUser3,
          mintparams,
          { value: stagePrice1 }
        )
      ).to.be.rejectedWith("ExceedPerAddressLimit()");
    });

    it("12. Public mint NFTs", async () => {
      // increase time to start round
      await ethers.provider.send("evm_increaseTime", [31 * 60 + 1]);

      // get total supply
      const preTotalSupply = await contracts.mimbokuMultiRound.totalSupply();
      expect(preTotalSupply).to.be.equal(100);

      // get balance of payee before mint
      const balanceBeforeMintPayee = await ethers.provider.getBalance(
        defaultAdmin.address
      );

      // loop to mint 200 NFTs to public user
      for (let i = 1; i <= 200; i++) {
        // mint a NFT to public user
        const toAddress = publicUser.address;
        const stageName = stageName_2;
        const signature = "0x";
        const mintparams = {
          amount: 1,
          tokenId: i,
          nonce: i,
          expiry: i,
          to: toAddress,
        };

        // mint a NFT with value of 100
        await contracts.publicUser.mimbokuMultiRound.mint(
          stageName,
          signature,
          [ethers.ZeroHash],
          mintparams,
          { value: stagePrice2 }
        );

        // query last minted token ID
        const tokenID = await contracts.mimbokuMultiRound.lastMintedTokenId();

        expect(tokenID).to.be.greaterThan(premintedAmount);

        tokenIDs.push(tokenID);
      }

      console.log("Token IDs: ", tokenIDs);

      // get balance of public user after mint
      const balanceAfterMintPublicUser = await ethers.provider.getBalance(
        publicUser.address
      );
      // get balance of payee after mint
      const balanceAfterMintPayee = await ethers.provider.getBalance(
        defaultAdmin.address
      );

      // check balance of payee
      expect(balanceAfterMintPayee).to.be.equal(
        BigInt(balanceBeforeMintPayee) + BigInt(stagePrice2 * 200)
      );

      // Mint 1 more NFT to public user
      const toAddress = publicUser.address;
      const stageName = stageName_2;
      const signature = "0x";
      const mintparams = {
        amount: 1,
        tokenId: 201,
        nonce: 201,
        expiry: 201,
        to: toAddress,
      };

      // mint a NFT with value of 100
      return expect(
        contracts.publicUser.mimbokuMultiRound.mint(
          stageName,
          signature,
          proofUser2,
          mintparams,
          { value: stagePrice2 }
        )
      ).to.be.rejectedWith("ExceedPerAddressLimit()");
    });
  });
});
