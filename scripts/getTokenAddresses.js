import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🪙 LoanVerse Token Addresses");
  console.log("=".repeat(60));

  // Connect to the deployed LoanVerseV4 contract
  const loanVerseAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const LoanVerseV4 = await ethers.getContractFactory("LoanVerseV4");
  const loanVerse = LoanVerseV4.attach(loanVerseAddress);

  console.log("\n📋 LoanVerse Contract:", loanVerseAddress);
  console.log("\n🎯 Supported Tokens (Import these into MetaMask):\n");

  try {
    // Get ETH (Token ID 0)
    const eth = await loanVerse.supportedTokens(0);
    console.log("Token ID 0: ETH (Native)");
    console.log("  ✅ Already supported in MetaMask");
    console.log("");

    // Get USDC (Token ID 1)
    const usdc = await loanVerse.supportedTokens(1);
    console.log("Token ID 1: USDC");
    console.log("  📍 Contract Address:", usdc.contractAddress);
    console.log("  🔢 Decimals:", usdc.decimals.toString());
    console.log("  💰 Symbol:", usdc.symbol);
    console.log("");

    // Get DAI (Token ID 2)
    const dai = await loanVerse.supportedTokens(2);
    console.log("Token ID 2: DAI");
    console.log("  📍 Contract Address:", dai.contractAddress);
    console.log("  🔢 Decimals:", dai.decimals.toString());
    console.log("  💰 Symbol:", dai.symbol);
    console.log("");

    console.log("=".repeat(60));
    console.log("📝 To Import Tokens into MetaMask:");
    console.log("=".repeat(60));
    console.log("\n1. Open MetaMask");
    console.log("2. Click 'Import tokens' at the bottom");
    console.log("3. Paste the contract address from above");
    console.log("4. Token symbol and decimals should auto-fill");
    console.log("5. Click 'Add Custom Token' then 'Import'");
    console.log("\n🎁 Get Free Test Tokens:");
    console.log("   Use the Token Faucet in the 'Browse Loans' tab");
    console.log("   OR run: npx hardhat run scripts/mintTestTokens.js");
    console.log("\n" + "=".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.log("\n💡 Make sure:");
    console.log("  1. Hardhat node is running (npx hardhat node)");
    console.log("  2. LoanVerseV4 is deployed at:", loanVerseAddress);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
