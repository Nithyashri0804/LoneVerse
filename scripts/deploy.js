import hre from "hardhat";

async function main() {
  console.log("Deploying LoanChain contract...");

  const LoanChain = await hre.ethers.getContractFactory("LoanChain");
  const loanChain = await LoanChain.deploy();

  await loanChain.waitForDeployment();

  console.log("LoanChain deployed to:", await loanChain.getAddress());
  console.log("Network:", hre.network.name);
  
  // Verify contract on Etherscan if not on hardhat network
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    const deploymentTx = loanChain.deploymentTransaction();
    await deploymentTx.wait(6);
    
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: await loanChain.getAddress(),
        constructorArguments: [],
      });
    } catch (error) {
      console.log("Error verifying contract:", error);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });