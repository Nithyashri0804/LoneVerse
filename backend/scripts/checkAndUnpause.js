import hre from "hardhat";
import LoanVerseABI from "../contracts/LoanVerse.json" assert { type: "json" };

async function main() {
  const { ethers } = hre;
  
  const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
  const provider = new ethers.JsonRpcProvider("http://localhost:8000");
  const signer = (await ethers.getSigners())[0] || provider;
  const contract = new ethers.Contract(contractAddress, LoanVerseABI.abi, signer);
  
  try {
    console.log("🔍 Checking if contract is paused...");
    const isPaused = await contract.paused();
    console.log(`Contract paused status: ${isPaused}`);
    
    if (isPaused) {
      console.log("\n⏸️  Contract is PAUSED. Unpausing...");
      const signers = await hre.ethers.getSigners();
      const signer = signers[0];
      const contractWithSigner = contract.connect(signer);
      const tx = await contractWithSigner.unpause();
      const receipt = await tx.wait();
      console.log("✅ Contract UNPAUSED successfully!");
      console.log(`Transaction: ${receipt.hash}`);
    } else {
      console.log("✅ Contract is already UNPAUSED. Good to go!");
    }
    
    // Try to fetch nextLoanId
    console.log("\n🧪 Testing nextLoanId call...");
    const nextId = await contract.nextLoanId();
    console.log(`✅ nextLoanId: ${nextId.toString()}`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
