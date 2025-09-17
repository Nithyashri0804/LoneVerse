import "dotenv/config";
import "@nomicfoundation/hardhat-toolbox";

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    compilers: [
      {
        version: "0.8.19", // for your contract
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
      {
        version: "0.8.20", // for OpenZeppelin contracts
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    ],
  },
  networks: {
    hardhat: {
      // removed the type line for compatibility
    },
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_URL || "https://sepolia.infura.io/v3/demo",
      // accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [], // commented out for now
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;