// const { use } = require("chai");

const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  const defaultAdmin = deployer;

  const treasury = "0x33B5be3B224aa4e312487399b91358c168B80d55";

  const merkleProofOG =
    "0xfbabaccbc32bc8e8a90cefd5574c244abfd4955e7f78374ca8df1f7221fd3371";
  const merkleProofWL =
    "0xfcb602dd9b6bd1cd053240e6ad933ee9520fce8c52975f216707f76dc8886ec5";

  const roundPrice = 46880000000000000000n; // 46.88 IP

  // deploy MimBokuMultiRound
  const iPMetadata = {
    rootNFT: {
      contractAddress: "0x82116603bA6014f815eF1E1Ca33f04154D0d58cA",
      tokenIds: [1, 2],
      ipIds: [
        "0xCdF104e4F24d593E16B9F6c382cEB1FB5573EEDd",
        "0x4172dB7f0E227858FC02862d831848539bD931B1",
      ],
      licenseTermsIds: [24, 24], // Commercial Remix license with 3% + 3% royalty
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

  // // deploy MimBokuNFT
  // const minter = mimBokuMultiRoundContract.address;
  // const tokenName = "Mimboku";
  // const tokenSymbol = "MIMBOKU";
  // const baseURI = "ipfs://QmasGRG2tyRWGZ7YPyQvY4U1V1qtU73wPvrYg6MCLCTztw/";
  // const mimBokuNftContract = await deploy("MimBokuNFT", {
  //   admin: defaultAdmin,
  //   from: deployer,
  //   gasLimit: 6000000,
  //   proxy: {
  //     execute: {
  //       init: {
  //         methodName: "initialize",
  //         args: [defaultAdmin, minter, tokenName, tokenSymbol, baseURI],
  //       },
  //     },
  //     proxyContract: "OpenZeppelinTransparentProxy",
  //   },
  //   args: [],
  //   log: true,
  // });

  // // set default royalty for MimBokuNFT
  // await execute(
  //   "MimBokuNFT",
  //   { from: deployer, log: true, gasLimit: 100000 },
  //   "setDefaultRoyalty",
  //   treasury,
  //   500
  // );

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
    "0xe42eF0e22b5BAacb9Dcea3e7F58a82D8033f0aCA",
    okxMultiMintContract.address
  );

  // set stage mint info for OG
  const stageMintInfoOG = {
    enableSig: 0,
    limitationForAddress: 1,
    maxSupplyForStage: 4980,
    startTime: 1739800800, // GMT Monday, February 17, 2025 2:00:00 PM
    endTime: 1739804400, // GMT Monday, February 17, 2025 3:00:00 PM
    price: roundPrice,
    paymentToken: ethers.ZeroAddress,
    payeeAddress: treasury,
    allowListMerkleRoot: merkleProofOG,
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
    limitationForAddress: 1,
    maxSupplyForStage: 4980,
    startTime: 1739804400, // GMT Monday, February 17, 2025 3:00:00 PM
    endTime: 1739808000, // GMT Monday, February 17, 2025 4:00:00 PM
    price: roundPrice,
    paymentToken: ethers.ZeroAddress,
    payeeAddress: treasury,
    allowListMerkleRoot: merkleProofWL,
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
    limitationForAddress: 2,
    maxSupplyForStage: 4980,
    startTime: 1739808000, // GMT Monday, February 17, 2025 4:00:00 PM
    endTime: 1739809800, // GMT Monday, February 17, 2025 4:30:00 PM
    price: roundPrice,
    paymentToken: ethers.ZeroAddress,
    payeeAddress: treasury,
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
    19
  );

  await execute(
    "MimbokuMultiround",
    { from: deployer, log: true, gasLimit: 12500000 },
    "setMaxsupply",
    5000
  );
};

module.exports.tags = ["contracts-deploy"];
