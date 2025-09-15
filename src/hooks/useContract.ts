import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import LoanChainABI from '../contracts/LoanChain.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

export const useContract = () => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    const initContract = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const web3Signer = web3Provider.getSigner();
        
        setProvider(web3Provider);
        setSigner(web3Signer);

        if (CONTRACT_ADDRESS) {
          const contractInstance = new ethers.Contract(
            CONTRACT_ADDRESS,
            LoanChainABI.abi,
            web3Signer
          );
          setContract(contractInstance);
        }
      }
    };

    initContract();
  }, []);

  return { contract, provider, signer };
};