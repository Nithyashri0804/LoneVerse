// Test script for minting tokens and testing multi-token scenarios
import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const [account1, account2] = await ethers.getSigners();
  console.log(`Testing with accounts:`);
  console.log(`Account 1: ${account1.address} (ETH: ${ethers.formatEther(await account1.provider.getBalance(account1.address))})`);
  console.log(`Account 2: ${account2.address} (ETH: ${ethers.formatEther(await account2.provider.getBalance(account2.address))})`);

  // Contract addresses from deployment
  const TOKEN_ADDRESSES = {
    USDC: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    DAI: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", 
    USDT: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  };

  // Get token contracts
  const usdc = await ethers.getContractAt("MockERC20", TOKEN_ADDRESSES.USDC);
  const dai = await ethers.getContractAt("MockERC20", TOKEN_ADDRESSES.DAI);
  const usdt = await ethers.getContractAt("MockERC20", TOKEN_ADDRESSES.USDT);

  console.log("\n🪙 Minting test tokens for both accounts...");
  
  // Mint tokens for account1
  console.log("Minting for Account 1:");
  await usdc.connect(account1).faucet(ethers.parseUnits("10000", 6)); // 10,000 USDC (6 decimals)
  await dai.connect(account1).faucet(ethers.parseUnits("10000", 18)); // 10,000 DAI (18 decimals)
  await usdt.connect(account1).faucet(ethers.parseUnits("10000", 6)); // 10,000 USDT (6 decimals)
  
  // Mint tokens for account2
  console.log("Minting for Account 2:");
  await usdc.connect(account2).faucet(ethers.parseUnits("10000", 6));
  await dai.connect(account2).faucet(ethers.parseUnits("10000", 18));
  await usdt.connect(account2).faucet(ethers.parseUnits("10000", 6));

  // Check balances
  console.log("\n💰 Token Balances:");
  console.log("Account 1:");
  console.log(`  USDC: ${ethers.formatUnits(await usdc.balanceOf(account1.address), 6)}`);
  console.log(`  DAI:  ${ethers.formatUnits(await dai.balanceOf(account1.address), 18)}`);
  console.log(`  USDT: ${ethers.formatUnits(await usdt.balanceOf(account1.address), 6)}`);
  
  console.log("Account 2:");
  console.log(`  USDC: ${ethers.formatUnits(await usdc.balanceOf(account2.address), 6)}`);
  console.log(`  DAI:  ${ethers.formatUnits(await dai.balanceOf(account2.address), 18)}`);
  console.log(`  USDT: ${ethers.formatUnits(await usdt.balanceOf(account2.address), 6)}`);

  console.log("\n✅ Test tokens minted! You can now:");
  console.log("1. Use your frontend to create loans with different token combinations");
  console.log("2. Test scenarios like:");
  console.log("   - Borrow USDC with ETH collateral");
  console.log("   - Borrow DAI with USDC collateral");
  console.log("   - Borrow ETH with USDT collateral");
  console.log("   - Same-token loans (e.g., DAI loan with DAI collateral)");
  
  console.log("\n⚠️  Remember to:");
  console.log("- Approve the LoanChain contract before using ERC20 tokens as collateral");
  console.log("- Use correct decimals: USDC/USDT=6, DAI/ETH=18");
  console.log("- Ensure 120%+ collateralization ratio");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});