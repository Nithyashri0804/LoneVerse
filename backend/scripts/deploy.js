const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying LoanVerse contract...");

  // Get the contract factory from the compiled artifact
  const LoanVerseABI = require("../contracts/LoanVerse.json");
  const accounts = await ethers.getSigners();
  
  // Deploy the contract
  const LoanVerse = await ethers.getContractFactory("LoanVerse");
  const loanverse = await LoanVerse.deploy();
  
  await loanverse.waitForDeployment();
  
  const contractAddress = await loanverse.getAddress();
  
  console.log("✅ LoanVerse contract deployed successfully!");
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log("\n🔧 Update your .env file with:");
  console.log(`VITE_LOANVERSE_V4_ADDRESS=${contractAddress}`);
  console.log("\n💡 Then restart your backend server for changes to take effect.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
