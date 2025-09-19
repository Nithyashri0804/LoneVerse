import pkg from "hardhat";
const { ethers, network } = pkg;

async function main() {
  console.log("Deploying LoanVerseV3 contract...");
  
  // Get the ContractFactory and Signers here.
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Deploy LoanVerseV3
  const LoanVerseV3 = await ethers.getContractFactory("LoanVerseV3");
  const loanVerseV3 = await LoanVerseV3.deploy();
  
  await loanVerseV3.waitForDeployment();
  const contractAddress = await loanVerseV3.getAddress();
  
  console.log("LoanVerseV3 deployed to:", contractAddress);
  console.log("Network:", network.name);
  
  // Add some supported tokens with mock price feeds for testing
  try {
    console.log("Setting up supported tokens...");
    
    // For local testing, we'll use mock addresses for price feeds
    // In production, these would be actual Chainlink aggregator addresses
    const mockPriceFeed = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Use contract address as mock
    
    // Note: In a real deployment, you would use actual Chainlink price feed addresses:
    // ETH/USD: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419 (Mainnet)
    // USDC/USD: 0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6 (Mainnet)
    // DAI/USD: 0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9 (Mainnet)
    
    console.log("Contract deployment completed successfully!");
    console.log("Next steps:");
    console.log("1. Update frontend configuration with new contract address");
    console.log("2. Set up actual Chainlink price feeds for production");
    console.log("3. Configure liquidation monitoring service");
    
  } catch (error) {
    console.error("Error setting up tokens:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });