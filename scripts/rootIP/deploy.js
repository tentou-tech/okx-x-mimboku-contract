// const { use } = require("chai");

const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  const defaultAdmin = deployer;

  // deploy MimBokuNFT
  const minter = deployer;
  const tokenName = "Mimboku Root for Test";
  const tokenSymbol = "MRT";
  const baseURI = "ipfs://QmVVdvHJ9DFaG8XAy6XwdcLGUuXUHzdrwYNEpNtVFeYKKi/";
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

  await execute(
    "MimBokuNFT",
    { from: deployer, log: true, gasLimit: 800000 },
    "safeMint",
    deployer,
    1
  );

  // setPreMintedCount for 20
  await execute(
    "MimBokuNFT",
    { from: deployer, log: true, gasLimit: 800000 },
    "safeMint",
    deployer,
    2
  );
};

module.exports.tags = ["nft-deploy"];
