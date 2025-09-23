import { useState, useEffect } from 'react';
import { BrowserProvider, formatEther, Contract } from 'ethers';
import { CONTRACT_ADDRESSES, SUPPORTED_CHAINS } from '../config/contracts';

interface TokenBalance {
  symbol: string;
  balance: string;
  address: string;
}

export const useWallet = () => {
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(false);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to use this application');
      return;
    }

    try {
      setIsLoading(true);
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        await updateBalance(accounts[0]);
        await checkNetwork();
        await updateTokenBalances(accounts[0]);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setBalance('0');
    setTokenBalances([]);
    setIsConnected(false);
    setChainId(null);
    setIsCorrectNetwork(false);
  };

  const updateBalance = async (address: string) => {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      setBalance(formatEther(balance));
    }
  };

  const checkNetwork = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      // Debug logging
      console.log('🔍 Network Debug Info:');
      console.log('- Detected Chain ID:', currentChainId);
      console.log('- Expected Hardhat ID:', SUPPORTED_CHAINS.HARDHAT);
      console.log('- Expected Sepolia ID:', SUPPORTED_CHAINS.SEPOLIA);
      console.log('- Is Hardhat?', currentChainId === SUPPORTED_CHAINS.HARDHAT);
      console.log('- Is Sepolia?', currentChainId === SUPPORTED_CHAINS.SEPOLIA);
      console.log('- Network Name:', network.name);
      
      setChainId(currentChainId);
      setIsCorrectNetwork(currentChainId === SUPPORTED_CHAINS.HARDHAT || currentChainId === SUPPORTED_CHAINS.SEPOLIA);
    }
  };

  const updateTokenBalances = async (address: string) => {
    if (!chainId || typeof window.ethereum === 'undefined') return;
    
    const addresses = CONTRACT_ADDRESSES[chainId];
    if (!addresses) return;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const tokenData = [
        { symbol: 'USDC', address: addresses.mockUSDC },
        { symbol: 'DAI', address: addresses.mockDAI },
        { symbol: 'USDT', address: addresses.mockUSDT }
      ];

      const balances = await Promise.all(
        tokenData.map(async (token) => {
          try {
            const tokenContract = new Contract(token.address, [
              'function balanceOf(address) view returns (uint256)',
              'function decimals() view returns (uint8)'
            ], provider);
            
            const balance = await tokenContract.balanceOf(address);
            const decimals = await tokenContract.decimals();
            
            return {
              symbol: token.symbol,
              balance: formatEther(balance * BigInt(10 ** (18 - decimals))),
              address: token.address
            };
          } catch {
            return {
              symbol: token.symbol,
              balance: '0',
              address: token.address
            };
          }
        })
      );

      setTokenBalances(balances);
    } catch (error) {
      console.error('Error fetching token balances:', error);
    }
  };

  const switchToSepolia = async () => {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia testnet
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added, add it
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Sepolia Testnet',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://sepolia.infura.io/v3/'],
            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
          }],
        });
      }
    }
  };

  const switchToLocalNetwork = async () => {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x7a69' }], // Hardhat local network (31337)
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added, add it
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x7a69',
            chainName: 'Hardhat Local',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['http://localhost:8000'],
            blockExplorerUrls: [''],
          }],
        });
      }
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });

        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
          await updateBalance(accounts[0]);
          await checkNetwork();
          await updateTokenBalances(accounts[0]);
        }
      }
    };

    checkConnection();

    // Listen for account changes
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          updateBalance(accounts[0]);
          checkNetwork();
          updateTokenBalances(accounts[0]);
        } else {
          disconnectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        checkNetwork();
        if (account) {
          updateTokenBalances(account);
        }
      });
    }

    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  return {
    account,
    balance,
    tokenBalances,
    isConnected,
    isLoading,
    chainId,
    isCorrectNetwork,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
    switchToLocalNetwork,
  };
};