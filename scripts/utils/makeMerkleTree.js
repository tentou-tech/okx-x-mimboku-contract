const { ethers } = require("hardhat");
const { default: MerkleTree } = require("merkletreejs");
const keccak256 = ethers.keccak256;
const fs = require("fs");

//ha"rdhat local node addresses from 0 to 3",
const address = [
  "0x9f5179ecD0F64e932Ea434aE8DE27Ea94574F632",
  "0x3a2D49d9282227a653c1A92b13E9742ad65Bba54",
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

// Create CSV content from data array
let csvContent = "address,proof\n";
data.forEach((item) => {
  csvContent += `${item.address},"${item.proof.join(",")}"\n`;
});

// Write whiteList.csv file in root dir
fs.writeFile(`whiteList.csv`, csvContent, (err) => {
  if (err) {
    throw err;
  }
});
