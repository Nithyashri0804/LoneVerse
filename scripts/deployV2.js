import hre from "hardhat";

async function main() {
  console.log("🚀 Deploying LoanChainV2 with multi-token support...");

  // Deploy mock ERC20 tokens first
  console.log("📄 Deploying mock tokens...");
  
  // Deploy Mock USDC (6 decimals like real USDC)
  const MockUSDC = await hre.ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockUSDC.deploy("Mock USD Coin", "USDC", 6, 1000000); // 1M USDC initial supply
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log("✅ Mock USDC deployed to:", usdcAddress);

  // Deploy Mock DAI (18 decimals)
  const MockDAI = await hre.ethers.getContractFactory("MockERC20");
  const mockDAI = await MockDAI.deploy("Mock Dai Stablecoin", "DAI", 18, 1000000); // 1M DAI initial supply
  await mockDAI.waitForDeployment();
  const daiAddress = await mockDAI.getAddress();
  console.log("✅ Mock DAI deployed to:", daiAddress);

  // Deploy Mock USDT (6 decimals like real USDT)
  const MockUSDT = await hre.ethers.getContractFactory("MockERC20");
  const mockUSDT = await MockUSDT.deploy("Mock Tether USD", "USDT", 6, 1000000); // 1M USDT initial supply
  await mockUSDT.waitForDeployment();
  const usdtAddress = await mockUSDT.getAddress();
  console.log("✅ Mock USDT deployed to:", usdtAddress);

  // Deploy LoanChainV2
  console.log("💰 Deploying LoanChainV2...");
  const LoanChainV2 = await hre.ethers.getContractFactory("LoanChainV2");
  const loanChainV2 = await LoanChainV2.deploy();
  await loanChainV2.waitForDeployment();
  const loanChainV2Address = await loanChainV2.getAddress();
  console.log("✅ LoanChainV2 deployed to:", loanChainV2Address);

  // Configure supported tokens
  console.log("⚙️ Configuring supported tokens...");
  
  // Add USDC support
  await loanChainV2.addSupportedToken(
    1, // TokenType.USDC
    usdcAddress,
    6,  // decimals
    hre.ethers.parseUnits("10", 6), // min: 10 USDC
    hre.ethers.parseUnits("2500000", 6) // max: 2.5M USDC
  );
  console.log("✅ USDC support added");

  // Add DAI support  
  await loanChainV2.addSupportedToken(
    2, // TokenType.DAI
    daiAddress,
    18, // decimals
    hre.ethers.parseEther("10"), // min: 10 DAI
    hre.ethers.parseEther("2500000") // max: 2.5M DAI
  );
  console.log("✅ DAI support added");

  // Add USDT support
  await loanChainV2.addSupportedToken(
    3, // TokenType.USDT
    usdtAddress,
    6,  // decimals
    hre.ethers.parseUnits("10", 6), // min: 10 USDT
    hre.ethers.parseUnits("2500000", 6) // max: 2.5M USDT
  );
  console.log("✅ USDT support added");

  // Update token prices with dual sources for the new oracle system
  await loanChainV2.updateTokenPrice(0, "250000000000", "250000000000"); // ETH: $2500 from both sources
  await loanChainV2.updateTokenPrice(1, "100000000", "100000000");       // USDC: $1.00 from both sources
  await loanChainV2.updateTokenPrice(2, "100000000", "100000000");       // DAI: $1.00 from both sources
  await loanChainV2.updateTokenPrice(3, "100000000", "100000000");       // USDT: $1.00 from both sources
  
  console.log("✅ Token prices updated with multi-oracle system");

  console.log("🎉 Deployment completed!");
  console.log("📋 Contract Addresses:");
  console.log("  LoanChainV2:", loanChainV2Address);
  console.log("  Mock USDC:", usdcAddress);
  console.log("  Mock DAI:", daiAddress);
  console.log("  Mock USDT:", usdtAddress);
  console.log("  Network:", hre.network.name);

  // Save addresses to config file
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    contracts: {
      loanChainV2: loanChainV2Address,
      mockUSDC: usdcAddress,
      mockDAI: daiAddress,
      mockUSDT: usdtAddress,
    }
  };

  // Write to both frontend configs
  const fs = await import('fs');
  
  // Update contract addresses in the frontend config
  const contractsConfig = `// Auto-generated contract addresses for ${hre.network.name}
export const LOANCHAIN_V2_ADDRESS = "${loanChainV2Address}";
export const TOKEN_ADDRESSES = {
  USDC: "${usdcAddress}",
  DAI: "${daiAddress}", 
  USDT: "${usdtAddress}",
};

export const DEPLOYMENT_INFO = ${JSON.stringify(deploymentInfo, null, 2)};
`;

  fs.writeFileSync(`deployments/${hre.network.name}-deployment.js`, contractsConfig);
  console.log(`✅ Deployment info saved to deployments/${hre.network.name}-deployment.js`);
  
  // Verify contracts on Etherscan if not on local network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("⏳ Waiting for block confirmations...");
    await loanChainV2.deploymentTransaction().wait(6);
    
    console.log("🔍 Verifying contracts on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: loanChainV2Address,
        constructorArguments: [],
      });
    } catch (error) {
      console.log("Error verifying LoanChainV2:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });