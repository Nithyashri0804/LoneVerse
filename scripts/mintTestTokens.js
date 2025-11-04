import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const [signer] = await ethers.getSigners();
  
  console.log("\n💰 Minting Test Tokens");
  console.log("Account:", signer.address);
  console.log("");

  // Connect to LoanVerseV4 to get token addresses
  const loanVerseAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const LoanVerseV4 = await ethers.getContractFactory("LoanVerseV4");
  const loanVerse = LoanVerseV4.attach(loanVerseAddress);

  try {
    // Get USDC token address
    const usdcInfo = await loanVerse.supportedTokens(1);
    const usdcAddress = usdcInfo.contractAddress;
    
    // Get DAI token address
    const daiInfo = await loanVerse.supportedTokens(2);
    const daiAddress = daiInfo.contractAddress;

    // Connect to token contracts
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = MockERC20.attach(usdcAddress);
    const dai = MockERC20.attach(daiAddress);

    // Mint USDC (6 decimals)
    console.log("🪙 Minting 10,000 USDC...");
    const usdcAmount = ethers.parseUnits("10000", 6);
    const tx1 = await usdc.faucet(usdcAmount);
    await tx1.wait();
    
    const usdcBalance = await usdc.balanceOf(signer.address);
    console.log("✅ USDC Balance:", ethers.formatUnits(usdcBalance, 6), "USDC");
    console.log("   Token Address:", usdcAddress);

    // Mint DAI (18 decimals)
    console.log("\n🪙 Minting 10,000 DAI...");
    const daiAmount = ethers.parseUnits("10000", 18);
    const tx2 = await dai.faucet(daiAmount);
    await tx2.wait();
    
    const daiBalance = await dai.balanceOf(signer.address);
    console.log("✅ DAI Balance:", ethers.formatUnits(daiBalance, 18), "DAI");
    console.log("   Token Address:", daiAddress);

    console.log("\n🎉 Success! Tokens minted to your address.");
    console.log("\n📝 Next Steps:");
    console.log("  1. Import these token addresses into MetaMask");
    console.log("  2. Run: npx hardhat run scripts/getTokenAddresses.js");
    console.log("");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
