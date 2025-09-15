import { BrowserProvider, ContractFactory } from 'ethers';
import LoanChainABI from './src/contracts/LoanChain.json' assert { type: 'json' };

async function deployContract() {
  try {
    // Check if we have MetaMask
    if (typeof window === 'undefined' || !window.ethereum) {
      console.log('Please run this in a browser with MetaMask installed');
      return;
    }

    // Connect to MetaMask
    const provider = new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();

    console.log('Deploying LoanChain contract...');
    console.log('Deployer address:', await signer.getAddress());

    // Deploy contract
    const contractFactory = new ContractFactory(
      LoanChainABI.abi,
      LoanChainABI.bytecode,
      signer
    );

    const contract = await contractFactory.deploy();
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log('LoanChain deployed to:', contractAddress);
    console.log('Transaction hash:', contract.deploymentTransaction()?.hash);

    // Save the address for the application
    console.log('\nAdd this to your environment variables:');
    console.log(`VITE_CONTRACT_ADDRESS=${contractAddress}`);

    return contractAddress;
  } catch (error) {
    console.error('Error deploying contract:', error);
  }
}

// Export for use in browser console
window.deployLoanChain = deployContract;