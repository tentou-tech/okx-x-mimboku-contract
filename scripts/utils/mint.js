const Web3 = require("web3").default;

// Replace with your Infura project ID or other provider URL
const providerUrl = "https://aeneid.storyrpc.io";
const web3 = new Web3(providerUrl);

// Replace with your contract's ABI and address
const contractABI = [
  {
    inputs: [
      {
        internalType: "string",
        name: "stage",
        type: "string",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
      {
        internalType: "bytes32[]",
        name: "proof",
        type: "bytes32[]",
      },
      {
        components: [
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "expiry",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "to",
            type: "address",
          },
        ],
        internalType: "struct IOKXMultiMint.MintParams",
        name: "mintparams",
        type: "tuple",
      },
    ],
    name: "mint",
    outputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "ipId",
        type: "address",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "stage",
        type: "string",
      },
    ],
    name: "stageToMint",
    outputs: [
      {
        components: [
          {
            internalType: "bool",
            name: "enableSig",
            type: "bool",
          },
          {
            internalType: "uint8",
            name: "limitationForAddress",
            type: "uint8",
          },
          {
            internalType: "uint32",
            name: "maxSupplyForStage",
            type: "uint32",
          },
          {
            internalType: "uint64",
            name: "startTime",
            type: "uint64",
          },
          {
            internalType: "uint64",
            name: "endTime",
            type: "uint64",
          },
          {
            internalType: "uint256",
            name: "price",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "paymentToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "payeeAddress",
            type: "address",
          },
          {
            internalType: "bytes32",
            name: "allowListMerkleRoot",
            type: "bytes32",
          },
          {
            internalType: "string",
            name: "stage",
            type: "string",
          },
          {
            internalType: "enum IOKXMultiMint.MintType",
            name: "mintType",
            type: "uint8",
          },
        ],
        internalType: "struct IOKXMultiMint.StageMintInfo",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];
const contractAddress = "0x6a720661FaF55793781001782afB330264277A4b";

// Replace with your wallet address and private key
const walletAddress = "0x3a2D49d9282227a653c1A92b13E9742ad65Bba54";
const privateKey =
  "123456784150f9987654321012346b64ffd58ecdaa7ef6b78830972348abcdef";

const contract = new web3.eth.Contract(contractABI, contractAddress);

async function mintToken(stage, signature, proof, mintparams) {
  const data = contract.methods
    .mint(stage, signature, proof, mintparams)
    .encodeABI();

  const nonce = await web3.eth.getTransactionCount(walletAddress, "latest");

  console.log("Nonce:", nonce);

  const tx = {
    nonce: nonce,
    from: walletAddress,
    to: contractAddress,
    gas: 2000000,
    maxPriorityFeePerGas: web3.utils.toWei("2", "gwei"),
    maxFeePerGas: web3.utils.toWei("100", "gwei"),
    value: 1, // Add the value to be sent with the transaction
    data: data,
  };

  const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);

  web3.eth
    .sendSignedTransaction(signedTx.rawTransaction)
    .on("receipt", console.log)
    .on("error", console.error);
}

// Replace with the address you want to mint the token to and the token ID
const toAddress = walletAddress;

const stage = "Whitelist";
const signature = "0x";
const proof = [
  "0x378e9f1a41c1e56c617e984522f13abd199f675a5a26bc31ff0e92ac56ea42b4",
  "0x820760fbade66e013e3a1a151425456bcede0b06c3a2e8f8ba0c895d4fa1f343",
];
const mintparams = {
  amount: 1,
  tokenId: 1,
  nonce: 1,
  expiry: 1,
  to: toAddress,
};

mintToken(stage, signature, proof, mintparams);
