// const { use } = require("chai");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const defaultAdmin = deployer;
  const pauser = deployer;

  // deploy DreamPoint token
  const minter = deployer;
  const granter = deployer;

  // // BaseOrgStoryNFT init prams
  // const orgTokenId = "1";
  // const orgIpId = "0x93Cdb8632Dfd0C6aF1075837d81c50bb458D6399";
  // const initParams = {
  //   owner: deployer,
  //   name: "Collection Name",
  //   symbol: "SYM",
  //   contractURI: "https://contractURI.com",
  //   baseURI: "ipfs://baseURI.com",
  //   customInitData: {
  //     tokenURI: "ipfs://tokenURI.com",
  //     signer: deployer,
  //     ipMetadataURI: "ipfs://ipMetadataURI.com",
  //     ipMetadataHash: "0x93Cdb8632Dfd0C6aF1075837d81c50bb458D6399",
  //     nftMetadataHash: "0x93Cdb8632Dfd0C6aF1075837d81c50bb458D6399",
  //   },
  // };

  // let Contract = await deploy("OKXxStoryProtocolOdysseyMint", {
  //   admin: deployer,
  //   from: deployer,
  //   gasLimit: 4000000,
  //   proxy: {
  //     execute: {
  //       init: {
  //         methodName: "_customize",
  //         args: [orgTokenId, orgIpId, initParams],
  //       },
  //     },
  //     proxyContract: "OpenZeppelinTransparentProxy",
  //   },
  //   args: [],
  //   log: true,
  // });
};

module.exports.tags = ["OKXxStoryProtocolOdysseyMint"];
