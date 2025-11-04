const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Minting tokens with account:", deployer.address);

  // Get the deployed token addresses from your local deployment
  const MOCK_USDC_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const MOCK_DAI_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  try {
    // Connect to Mock USDC
    const MockUSDC = await ethers.getContractAt("MockERC20", MOCK_USDC_ADDRESS);
    
    // Check if contract exists and has decimals function
    let decimals;
    try {
      decimals = await MockUSDC.decimals();
      console.log("USDC decimals:", decimals);
    } catch (error) {
      console.log("Warning: decimals() not available, using default 18");
      decimals = 18;
    }

    // Mint 10,000 USDC (adjust decimals accordingly)
    const mintAmount = ethers.parseUnits("10000", decimals);
    console.log(`\nMinting ${ethers.formatUnits(mintAmount, decimals)} USDC to ${deployer.address}...`);
    
    let tx = await MockUSDC.mint(deployer.address, mintAmount);
    await tx.wait();
    console.log("✅ USDC minted successfully!");

    let balance = await MockUSDC.balanceOf(deployer.address);
    console.log(`USDC Balance: ${ethers.formatUnits(balance, decimals)}`);

    // Connect to Mock DAI
    console.log("\n--- Minting DAI ---");
    const MockDAI = await ethers.getContractAt("MockERC20", MOCK_DAI_ADDRESS);
    
    try {
      decimals = await MockDAI.decimals();
      console.log("DAI decimals:", decimals);
    } catch (error) {
      console.log("Warning: decimals() not available, using default 18");
      decimals = 18;
    }

    const daiMintAmount = ethers.parseUnits("10000", decimals);
    console.log(`Minting ${ethers.formatUnits(daiMintAmount, decimals)} DAI to ${deployer.address}...`);
    
    tx = await MockDAI.mint(deployer.address, daiMintAmount);
    await tx.wait();
    console.log("✅ DAI minted successfully!");

    balance = await MockDAI.balanceOf(deployer.address);
    console.log(`DAI Balance: ${ethers.formatUnits(balance, decimals)}`);

    console.log("\n✅ All tokens minted successfully!");

  } catch (error) {
    console.error("\n❌ Error during minting:");
    console.error(error.message);
    
    // Provide helpful debugging info
    console.log("\n💡 Troubleshooting tips:");
    console.log("1. Make sure Hardhat node is running: npx hardhat node");
    console.log("2. Ensure contracts are deployed: npx hardhat run scripts/deployV4.js --network localhost");
    console.log("3. Verify the token addresses match your deployment");
    console.log("4. Check that the contracts have a mint() function");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
