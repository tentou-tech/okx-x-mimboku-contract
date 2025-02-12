// const { use } = require("chai");

const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  const defaultAdmin = deployer;

  // deploy MimBokuMultiRound
  const iPMetadata = {
    rootNFT: {
      contractAddress: "0xfbC38Bd2F4328364dE86695e724F80F2B78CB869",
      tokenIds: [1, 2],
      ipIds: [
        "0x15E84a494C1a57b8681edf39A8755359c67f43FF",
        "0xDB291421D5354A3A6F94046a64B710bB43523019",
      ],
      licenseTermsIds: [20, 20], // Commercial Remix license with 5% royalty
    },
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
    gasLimit: 6000000,
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
  const tokenName = "M for test";
  const tokenSymbol = "MFT";
  const baseURI = "ipfs://QmasGRG2tyRWGZ7YPyQvY4U1V1qtU73wPvrYg6MCLCTztw/";
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

  // set default royalty for MimBokuNFT
  await execute(
    "MimBokuNFT",
    { from: deployer, log: true, gasLimit: 100000 },
    "setDefaultRoyalty",
    defaultAdmin,
    500
  );

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

  // set stage mint info for OG
  const stageMintInfoOG = {
    enableSig: 0,
    limitationForAddress: 5,
    maxSupplyForStage: 1000,
    startTime: 1739275200, // GMT Tuesday, February 11, 2025 12:00:00 PM
    endTime: 1739750399, // GMT Sunday, February 16, 2025 11:59:59 PM
    price: 10000000000000000n, // 0.01 IP
    paymentToken: ethers.ZeroAddress,
    payeeAddress: deployer,
    allowListMerkleRoot:
      "0x506fc6bfb0a55419a813e56bf8de8564b4600d188c1911f09ab1580df9e1be38",
    stage: "OG",
    mintType: 1,
  };

  await execute(
    "MimbokuMultiround",
    { from: deployer, log: true, gasLimit: 300000 },
    "setStageMintInfo",
    stageMintInfoOG
  );

  // set stage mint info for WL
  const stageMintInfoWL = {
    enableSig: 0,
    limitationForAddress: 5,
    maxSupplyForStage: 3980,
    startTime: 1739275200, // GMT Tuesday, February 11, 2025 12:00:00 PM
    endTime: 1739750399, // GMT Sunday, February 16, 2025 11:59:59 PM
    price: 10000000000000000n, // 0.01 IP
    paymentToken: ethers.ZeroAddress,
    payeeAddress: deployer,
    allowListMerkleRoot:
      "0x506fc6bfb0a55419a813e56bf8de8564b4600d188c1911f09ab1580df9e1be38",
    stage: "Whitelist",
    mintType: 1,
  };

  await execute(
    "MimbokuMultiround",
    { from: deployer, log: true, gasLimit: 300000 },
    "setStageMintInfo",
    stageMintInfoWL
  );

  // set stage mint info
  const stageMintInfo2 = {
    enableSig: 0,
    limitationForAddress: 1,
    maxSupplyForStage: 3980,
    startTime: 1739275200, // GMT Tuesday, February 11, 2025 12:00:00 PM
    endTime: 1739750399, // GMT Sunday, February 16, 2025 11:59:59 PM
    price: 20000000000000000n, // 0.02 IP
    paymentToken: ethers.ZeroAddress,
    payeeAddress: deployer,
    allowListMerkleRoot: ethers.ZeroHash,
    stage: "Public",
    mintType: 0,
  };

  await execute(
    "MimbokuMultiround",
    { from: deployer, log: true, gasLimit: 300000 },
    "setStageMintInfo",
    stageMintInfo2
  );

  // setPreMintedCount for 20
  await execute(
    "MimbokuMultiround",
    { from: deployer, log: true, gasLimit: 200000 },
    "setPreMintedCount",
    20
  );

  await execute(
    "MimbokuMultiround",
    { from: deployer, log: true, gasLimit: 12500000 },
    "setMaxsupply",
    5000
  );
};

module.exports.tags = ["contracts-deploy"];
