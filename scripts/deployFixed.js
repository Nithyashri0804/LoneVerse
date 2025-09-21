import hre from "hardhat";

// This script ensures consistent contract addresses across deployments
// by using deterministic deployment order and reset state

async function main() {
  console.log("🚀 Deploying contracts with FIXED addresses...");
  console.log("📍 Network:", hre.network.name);

  // Reset the chain for true deterministic addresses (only for hardhat/localhost)
  if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
    console.log("🔄 Resetting chain for consistent addresses...");
    await hre.network.provider.send("hardhat_reset");
    console.log("✅ Chain reset complete");
  }

  // Get the deployer account (always the same with our fixed mnemonic)
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployer address:", deployer.address);
  console.log("💰 Deployer balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  console.log("\n=== FIXED CONTRACT ADDRESSES ===");
  console.log("These addresses will be the same every time you deploy:");
  
  // Deploy contracts in exact same order every time
  console.log("\n📄 1. Deploying Mock USDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockUSDC.deploy("Mock USD Coin", "USDC", 6, 1000000);
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log("✅ Mock USDC:", usdcAddress);

  console.log("\n📄 2. Deploying Mock DAI...");
  const MockDAI = await hre.ethers.getContractFactory("MockERC20");
  const mockDAI = await MockDAI.deploy("Mock Dai Stablecoin", "DAI", 18, 1000000);
  await mockDAI.waitForDeployment();
  const daiAddress = await mockDAI.getAddress();
  console.log("✅ Mock DAI:", daiAddress);

  console.log("\n📄 3. Deploying Mock USDT...");
  const MockUSDT = await hre.ethers.getContractFactory("MockERC20");
  const mockUSDT = await MockUSDT.deploy("Mock Tether USD", "USDT", 6, 1000000);
  await mockUSDT.waitForDeployment();
  const usdtAddress = await mockUSDT.getAddress();
  console.log("✅ Mock USDT:", usdtAddress);

  console.log("\n💰 4. Deploying LoanChainV2...");
  const LoanChainV2 = await hre.ethers.getContractFactory("LoanChainV2");
  const loanChainV2 = await LoanChainV2.deploy();
  await loanChainV2.waitForDeployment();
  const loanChainV2Address = await loanChainV2.getAddress();
  console.log("✅ LoanChainV2:", loanChainV2Address);

  console.log("\n🔄 5. Deploying TokenSwap...");
  const TokenSwap = await hre.ethers.getContractFactory("TokenSwap");
  const tokenSwap = await TokenSwap.deploy(loanChainV2Address);
  await tokenSwap.waitForDeployment();
  const tokenSwapAddress = await tokenSwap.getAddress();
  console.log("✅ TokenSwap:", tokenSwapAddress);

  // Configure the contracts
  console.log("\n⚙️ Configuring supported tokens...");
  
  // Add token support in exact same order
  await loanChainV2.addSupportedToken(1, usdcAddress, 6, hre.ethers.parseUnits("10", 6), hre.ethers.parseUnits("2500000", 6));
  console.log("✅ USDC support added");

  await loanChainV2.addSupportedToken(2, daiAddress, 18, hre.ethers.parseEther("10"), hre.ethers.parseEther("2500000"));
  console.log("✅ DAI support added");

  await loanChainV2.addSupportedToken(3, usdtAddress, 6, hre.ethers.parseUnits("10", 6), hre.ethers.parseUnits("2500000", 6));
  console.log("✅ USDT support added");

  await loanChainV2.addSupportedToken(0, "0x0000000000000000000000000000000000000000", 18, hre.ethers.parseEther("0.01"), hre.ethers.parseEther("100000"));
  console.log("✅ NATIVE_ETH support added");

  // Set token prices
  await loanChainV2.updateTokenPrice(0, "250000000000", "250000000000");
  await loanChainV2.updateTokenPrice(1, "100000000", "100000000");
  await loanChainV2.updateTokenPrice(2, "100000000", "100000000");
  await loanChainV2.updateTokenPrice(3, "100000000", "100000000");
  console.log("✅ Token prices updated");

  // Add initial liquidity
  console.log("\n💰 Adding initial liquidity...");
  await tokenSwap.addLiquidity(0, hre.ethers.parseEther("10"), { value: hre.ethers.parseEther("10") });
  await mockUSDC.mint(await tokenSwap.getAddress(), hre.ethers.parseUnits("25000", 6));
  await mockDAI.mint(await tokenSwap.getAddress(), hre.ethers.parseEther("25000"));
  await mockUSDT.mint(await tokenSwap.getAddress(), hre.ethers.parseUnits("25000", 6));
  console.log("✅ Initial liquidity added");

  console.log("\n🎉 DEPLOYMENT COMPLETED!");
  console.log("\n📋 FIXED CONTRACT ADDRESSES (same every time):");
  console.log(`  Mock USDC:    ${usdcAddress}`);
  console.log(`  Mock DAI:     ${daiAddress}`);
  console.log(`  Mock USDT:    ${usdtAddress}`);
  console.log(`  LoanChainV2:  ${loanChainV2Address}`);
  console.log(`  TokenSwap:    ${tokenSwapAddress}`);
  console.log(`  Network:      ${hre.network.name}`);

  // Create environment template
  console.log("\n📝 Environment Configuration:");
  console.log("Add these FIXED addresses to your .env file:\n");
  console.log("# FIXED CONTRACT ADDRESSES - NEVER CHANGE");
  console.log(`VITE_LOANCHAIN_V2_ADDRESS=${loanChainV2Address}`);
  console.log(`VITE_TOKEN_SWAP_ADDRESS=${tokenSwapAddress}`);
  console.log(`VITE_MOCK_USDC_ADDRESS=${usdcAddress}`);
  console.log(`VITE_MOCK_DAI_ADDRESS=${daiAddress}`);
  console.log(`VITE_MOCK_USDT_ADDRESS=${usdtAddress}`);
  console.log(`LOANVERSE_CONTRACT_ADDRESS=${loanChainV2Address}`);

  // Save to deployment file
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    fixed: true,
    contracts: {
      loanChainV2: loanChainV2Address,
      tokenSwap: tokenSwapAddress,
      mockUSDC: usdcAddress,
      mockDAI: daiAddress,
      mockUSDT: usdtAddress,
    }
  };

  const fs = await import('fs');
  const contractsConfig = `// FIXED contract addresses for ${hre.network.name} - NEVER CHANGE
export const LOANCHAIN_V2_ADDRESS = "${loanChainV2Address}";
export const TOKEN_ADDRESSES = {
  USDC: "${usdcAddress}",
  DAI: "${daiAddress}", 
  USDT: "${usdtAddress}",
};

export const DEPLOYMENT_INFO = ${JSON.stringify(deploymentInfo, null, 2)};
`;

  fs.writeFileSync(`deployments/${hre.network.name}-fixed-deployment.js`, contractsConfig);
  console.log(`\n✅ Fixed addresses saved to deployments/${hre.network.name}-fixed-deployment.js`);
  
  console.log("\n🔄 NEXT TIME: Use this same script and get EXACT same addresses!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });