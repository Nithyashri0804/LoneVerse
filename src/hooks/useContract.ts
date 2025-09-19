import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, Signer } from 'ethers';
import { getPrimaryContractAddress, isChainSupported } from '../config/contracts';
import LoanChainV1ABI from '../contracts/LoanChain.json';
import LoanChainV2ABI from '../contracts/LoanChainV2.json';

export const useContract = () => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isUnsupportedNetwork, setIsUnsupportedNetwork] = useState(false);

  useEffect(() => {
    const initContract = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const web3Provider = new BrowserProvider(window.ethereum);
          const network = await web3Provider.getNetwork();
          const currentChainId = Number(network.chainId);
          
          setChainId(currentChainId);
          setProvider(web3Provider);

          if (!isChainSupported(currentChainId)) {
            setIsUnsupportedNetwork(true);
            setContract(null);
            setSigner(null);
            return;
          }

          setIsUnsupportedNetwork(false);
          const web3Signer = await web3Provider.getSigner();
          setSigner(web3Signer);

          const { address: contractAddress, version } = getPrimaryContractAddress(currentChainId);
          if (contractAddress) {
            // Select the correct ABI based on the deployed version
            const abi = version === 'v2' ? LoanChainV2ABI.abi : LoanChainV1ABI.abi;
            
            const contractInstance = new Contract(
              contractAddress,
              abi,
              web3Signer
            );
            setContract(contractInstance);
            console.log(`✅ Connected to LoanChain ${version.toUpperCase()} at ${contractAddress}`);
          } else {
            console.warn(`No contract address available for chain ${currentChainId}`);
            setContract(null);
          }
        } catch (error) {
          console.error('Error initializing contract:', error);
          setIsUnsupportedNetwork(true);
        }
      }
    };

    initContract();

    // Listen for network changes
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('chainChanged', () => {
        initContract();
      });
    }

    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  return { 
    contract, 
    provider, 
    signer, 
    chainId, 
    isUnsupportedNetwork 
  };
};