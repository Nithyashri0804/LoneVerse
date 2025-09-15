import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, Signer } from 'ethers';
import LoanChainABI from '../contracts/LoanChain.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

export const useContract = () => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);

  useEffect(() => {
    const initContract = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const web3Provider = new BrowserProvider(window.ethereum);
        const web3Signer = await web3Provider.getSigner();
        
        setProvider(web3Provider);
        setSigner(web3Signer);

        if (CONTRACT_ADDRESS) {
          const contractInstance = new Contract(
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