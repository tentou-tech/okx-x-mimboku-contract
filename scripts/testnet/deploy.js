// const { use } = require("chai");

const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  const defaultAdmin = deployer;

  // deploy MimBokuMultiRound
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
  const mimBokuMultiRoundContract = await deploy("MimbokuMultiround", {
    admin: defaultAdmin,
    from: deployer,
    gasLimit: 4000000,
    proxy: {
      execute: {
        init: {
          methodName: "initialize",
          args: [defaultAdmin, deployer, deployer, deployer, iPMetadata],
        },
      },
      proxyContract: "OpenZeppelinTransparentProxy",
    },
    args: [],
    log: true,
  });

  // deploy MimBokuNFT
  const minter = mimBokuMultiRoundContract.address;
  const tokenName = "Just for test";
  const tokenSymbol = "JFT";
  const baseURI = "ipfs://tokenURI.com";
  const mimBokuNftContract = await deploy("MimBokuNFT", {
    admin: defaultAdmin,
    from: deployer,
    gasLimit: 6000000,
    proxy: {
      execute: {
        init: {
          methodName: "initialize",
          args: [defaultAdmin, minter, tokenName, tokenSymbol, baseURI],
        },
      },
      proxyContract: "OpenZeppelinTransparentProxy",
    },
    args: [],
    log: true,
  });

  const owner = mimBokuMultiRoundContract.address;
  // deploy OKXMultiMint
  const okxMultiMintContract = await deploy("OKXMultiMint", {
    admin: defaultAdmin,
    from: deployer,
    gasLimit: 6000000,
    proxy: {
      execute: {
        init: {
          methodName: "initialize",
          args: [deployer, owner, deployer],
        },
      },
      proxyContract: "OpenZeppelinTransparentProxy",
    },
    args: [],
    log: true,
  });

  // update nftContract and rounds manager contract of MimBokuMultiRound
  await execute(
    "MimbokuMultiround",
    { from: deployer, log: true, gasLimit: 50000 },
    "setContracts",
    mimBokuNftContract.address,
    okxMultiMintContract.address
  );

  // set stage mint info
  const stageMintInfo = {
    enableSig: 0,
    limitationForAddress: 10,
    maxSupplyForStage: 100,
    startTime: Math.floor(Date.now() / 1000),
    endTime: Math.floor((Date.now() + 60 * 60 * 1000) / 1000), // 1 hour later
    price: 1,
    paymentToken: ethers.ZeroAddress,
    payeeAddress: deployer,
    allowListMerkleRoot:
      "0x48d4b355d04495ff5eef1f1f6a4d0ae1e999e125f180fe304123ba94c98f98a1",
    stage: "Whitelist",
    mintType: 1,
  };

  await execute(
    "MimbokuMultiround",
    { from: deployer, log: true, gasLimit: 6000000 },
    "setStageMintInfo",
    stageMintInfo
  );

  // set stage mint info
  const stageMintInfo2 = {
    enableSig: 0,
    limitationForAddress: 1,
    maxSupplyForStage: 100,
    startTime: Math.floor((Date.now() + 61 * 60 * 1000) / 1000), // 1 hour and 1 minute later
    endTime: Math.floor((Date.now() + 120 * 60 * 1000) / 1000), // 2 hours later
    price: 1,
    paymentToken: ethers.ZeroAddress,
    payeeAddress: deployer,
    allowListMerkleRoot: ethers.ZeroHash,
    stage: "Publicccccc",
    mintType: 0,
  };

  await execute(
    "MimbokuMultiround",
    { from: deployer, log: true, gasLimit: 800000 },
    "setStageMintInfo",
    stageMintInfo2
  );
};

module.exports.tags = ["contracts-deploy"];
