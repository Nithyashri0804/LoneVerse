import pkg from "hardhat";
const { ethers, network } = pkg;

async function main() {
  console.log("Deploying LoanVerseV4 (Multi-Lender Pooled Lending) contract...");
  
  // Use the provider from the network configuration
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));
  
  // Deploy LoanVerseV4
  console.log("\n📦 Deploying LoanVerseV4...");
  const LoanVerseV4 = await ethers.getContractFactory("LoanVerseV4");
  const loanVerseV4 = await LoanVerseV4.deploy();
  
  await loanVerseV4.waitForDeployment();
  const contractAddress = await loanVerseV4.getAddress();
  
  console.log("✅ LoanVerseV4 deployed to:", contractAddress);
  console.log("Network:", network.name);
  
  // Add some supported tokens for testing
  try {
    console.log("\n🪙 Setting up supported tokens...");
    
    // Deploy Mock ERC20 tokens for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    
    // Deploy USDC mock
    console.log("Deploying Mock USDC...");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6, 1000000); // name, symbol, decimals, initialSupply
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();
    console.log("✅ Mock USDC deployed to:", usdcAddress);
    
    // Deploy DAI mock
    console.log("Deploying Mock DAI...");
    const dai = await MockERC20.deploy("Dai Stablecoin", "DAI", 18, 1000000); // name, symbol, decimals, initialSupply
    await dai.waitForDeployment();
    const daiAddress = await dai.getAddress();
    console.log("✅ Mock DAI deployed to:", daiAddress);
    
    // Deploy Mock Price Feeds (for testing without Chainlink)
    console.log("\n📊 Deploying Mock Price Feeds...");
    const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    
    // ETH/USD price feed (mock $2000)
    const ethPriceFeed = await MockV3Aggregator.deploy(8, 200000000000); // $2000 with 8 decimals
    await ethPriceFeed.waitForDeployment();
    const ethPriceFeedAddress = await ethPriceFeed.getAddress();
    console.log("✅ ETH/USD Price Feed:", ethPriceFeedAddress);
    
    // USDC/USD price feed (mock $1)
    const usdcPriceFeed = await MockV3Aggregator.deploy(8, 100000000); // $1 with 8 decimals
    await usdcPriceFeed.waitForDeployment();
    const usdcPriceFeedAddress = await usdcPriceFeed.getAddress();
    console.log("✅ USDC/USD Price Feed:", usdcPriceFeedAddress);
    
    // DAI/USD price feed (mock $1)
    const daiPriceFeed = await MockV3Aggregator.deploy(8, 100000000); // $1 with 8 decimals
    await daiPriceFeed.waitForDeployment();
    const daiPriceFeedAddress = await daiPriceFeed.getAddress();
    console.log("✅ DAI/USD Price Feed:", daiPriceFeedAddress);
    
    // Add tokens to LoanVerseV4
    console.log("\n➕ Adding tokens to LoanVerseV4...");
    
    // Note: ETH (Token ID 0) is already added in the constructor
    // It uses a mock price of $2000 (no price feed needed for testing)
    console.log("📝 ETH (Token ID 0) is already configured in constructor");
    console.log("   Using mock price: $2000 (hardcoded in getLatestPrice)");
    
    // Add USDC (Token ID 1)
    const tx1 = await loanVerseV4.addSupportedToken(
      usdcAddress,
      "USDC",
      6,
      usdcPriceFeedAddress
    );
    await tx1.wait();
    console.log("✅ USDC added as token ID: 1");
    
    // Add DAI (Token ID 2)
    const tx2 = await loanVerseV4.addSupportedToken(
      daiAddress,
      "DAI",
      18,
      daiPriceFeedAddress
    );
    await tx2.wait();
    console.log("✅ DAI added as token ID: 2");
    
    console.log("\n💰 Initial token supply:");
    console.log("✅ Deployer has 1,000,000 USDC (via initial supply)");
    console.log("✅ Deployer has 1,000,000 DAI (via initial supply)");
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 LoanVerseV4 Deployment Summary");
    console.log("=".repeat(60));
    console.log("📋 Contract Addresses:");
    console.log("  LoanVerseV4:     ", contractAddress);
    console.log("  Mock USDC:       ", usdcAddress);
    console.log("  Mock DAI:        ", daiAddress);
    console.log("  ETH Price Feed:  ", ethPriceFeedAddress);
    console.log("  USDC Price Feed: ", usdcPriceFeedAddress);
    console.log("  DAI Price Feed:  ", daiPriceFeedAddress);
    console.log("\n📝 Supported Tokens:");
    console.log("  Token ID 0: ETH (Native) - Mock price: $2000");
    console.log("  Token ID 1: USDC - Price feed: " + usdcPriceFeedAddress);
    console.log("  Token ID 2: DAI - Price feed: " + daiPriceFeedAddress);
    console.log("\n✨ Features Enabled:");
    console.log("  ✅ Multi-lender pooled lending");
    console.log("  ✅ Proportional interest distribution");
    console.log("  ✅ Minimum contribution limits");
    console.log("  ✅ Funding deadlines with auto-refunds");
    console.log("  ✅ Voting mechanism for liquidation");
    console.log("  ✅ AI risk scoring integration");
    console.log("  ✅ Credit score tracking (300-850)");
    console.log("\n📖 Next Steps:");
    console.log("  1. Update frontend config with contract address:");
    console.log("     VITE_LOANVERSE_V4_ADDRESS=" + contractAddress);
    console.log("  2. Test multi-lender loan creation");
    console.log("  3. Test multiple lenders contributing to same loan");
    console.log("  4. Test proportional repayment distribution");
    console.log("  5. Test voting mechanism on defaults");
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("❌ Error setting up tokens:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
