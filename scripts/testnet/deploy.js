// const { use } = require("chai");

const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  const defaultAdmin = deployer;

  // deploy MimBokuMultiRound
  const iPMetadata = {
    rootNFT: {
      contractAddress: "0x58f70546aB8315010cd659AD2E5d06BeDd37C5A3",
      tokenId: 1,
      ipId: "0xb7ca5DB08Be6A03cF2A416807Abac4c1385f3C7C",
    },
    defaultLicenseTermsId: 1,
    pilTemplate: "0x58E2c909D557Cd23EF90D14f8fd21667A5Ae7a93",
    ipAssetRegistry: "0x28E59E91C0467e89fd0f0438D47Ca839cDfEc095",
    coreMetadataModule: "0x89630Ccf23277417FBdfd3076C702F5248267e78",
    licenseModule: "0x5a7D9Fa17DE09350F481A53B470D798c1c1aabae",
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
    { from: deployer, log: true, gasLimit: 200000 },
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

  // set stage mint info
  const stageMintInfo = {
    enableSig: 1,
    limitationForAddress: 50,
    maxSupplyForStage: 100,
    startTime: Math.floor((Date.now() + 60 * 1000) / 1000), // 1 mins later
    endTime: Math.floor((Date.now() + 5 * 24 * 60 * 60 * 1000) / 1000), // 5 days later
    price: 100000000000000000n,
    paymentToken: ethers.ZeroAddress,
    payeeAddress: deployer,
    allowListMerkleRoot:
      "0x506fc6bfb0a55419a813e56bf8de8564b4600d188c1911f09ab1580df9e1be38",
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
    enableSig: 1,
    limitationForAddress: 5,
    maxSupplyForStage: 100,
    startTime: Math.floor((Date.now() + 60 * 1000) / 1000), // 1 mins later
    endTime: Math.floor((Date.now() + 5 * 24 * 60 * 60 * 1000) / 1000), // 5 days later
    price: 200000000000000000n,
    paymentToken: ethers.ZeroAddress,
    payeeAddress: deployer,
    allowListMerkleRoot: ethers.ZeroHash,
    stage: "Public",
    mintType: 0,
  };

  await execute(
    "MimbokuMultiround",
    { from: deployer, log: true, gasLimit: 800000 },
    "setStageMintInfo",
    stageMintInfo2
  );

  // setPreMintedCount for 20
  await execute(
    "MimbokuMultiround",
    { from: deployer, log: true, gasLimit: 600000 },
    "setPreMintedCount",
    20
  );

  // Set Signer
  await execute(
    "MimbokuMultiround",
    { from: deployer, log: true, gasLimit: 600000 },
    "setSigner",
    "0x7956853188c5fdaa5853ed12346f78991d3807d9"
  );
};

module.exports.tags = ["contracts-deploy"];
