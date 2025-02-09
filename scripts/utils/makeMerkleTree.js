const { ethers } = require("hardhat");
const { default: MerkleTree } = require("merkletreejs");
const keccak256 = ethers.keccak256;
const fs = require("fs");

//hardhat local node addresses from 0 to 3
const address = [
  "0x95c2E9FA2A2834CB624361010fA91B038270F4BD",
  "0xc173bB17b5D2C7BCEd8a6f50E6F9c1bD6bde48DD",
  "0xe5a325ef78660df15b367d2f0e2469b4361c9884",
  "0x92815b16a0563271dcf34ba6597123c136b671f7",
  "0x5d2614e0630aa8a556d16bce96e78eaf08098021",
  "0x7dfb98ac2167b16f667ad8ee3730cff849016a0f",
  "0x3a2D49d9282227a653c1A92b13E9742ad65Bba54",
  "0x659c1E1D008b174CcE2Cf22632aaB1add333Dc50",
];

//  Hashing All Leaf Individual
//leaves is an array of hashed addresses (leaves of the Merkle Tree).
const leaves = address.map((leaf) => keccak256(leaf));

// Constructing Merkle Tree
const tree = new MerkleTree(leaves, keccak256, {
  sortPairs: true,
});

//  Utility Function to Convert From Buffer to Hex
const bufferToHex = (x) => "0x" + x.toString("hex");

// Get Root of Merkle Tree
console.log(`Here is Root Hash: ${bufferToHex(tree.getRoot())}`);

let data = [];

// Pushing all the proof and leaf in data array
address.forEach((address) => {
  const leaf = keccak256(address);

  const proof = tree.getProof(leaf);

  let tempData = [];

  proof.map((x) => tempData.push(bufferToHex(x.data)));

  data.push({
    address: address,
    leaf: bufferToHex(leaf),
    proof: tempData,
  });
});

// Create WhiteList Object to write JSON file

let whiteList = {
  whiteList: data,
};

//  Stringify whiteList object and formating
const metadata = JSON.stringify(whiteList, null, 2);

// Write whiteList.json file in root dir
fs.writeFile(`whiteList.json`, metadata, (err) => {
  if (err) {
    throw err;
  }
});
