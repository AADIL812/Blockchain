require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // This line is crucial, it loads your .env file

// Get the variables from your .env file
const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  
  // This 'networks' object is what fixes your error
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL || "", // Uses the URL from your .env
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [], // Uses the private key from your .env
    },
  },
};