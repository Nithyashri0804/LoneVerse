import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LoanVerseABI = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../artifacts/contracts/LoanVerseV4.sol/LoanVerseV4.json"), "utf-8"));

async function main() {
  const { ethers } = hre;
  
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
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
