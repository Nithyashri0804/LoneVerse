import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, Signer } from 'ethers';
import { getContractAddress, isChainSupported } from '../config/contracts';
import LoanChainABI from '../contracts/LoanChain.json';

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

          const contractAddress = getContractAddress(currentChainId);
          if (contractAddress) {
            const contractInstance = new Contract(
              contractAddress,
              LoanChainABI.abi,
              web3Signer
            );
            setContract(contractInstance);
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