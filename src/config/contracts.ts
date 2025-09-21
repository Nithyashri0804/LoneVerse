// Contract addresses for different networks
export const SUPPORTED_CHAINS = {
  SEPOLIA: 11155111,
  HARDHAT: 31337,
} as const;

export const CONTRACT_ADDRESSES: Record<number, { 
  loanChain: string; 
  loanChainV2: string;
  loanChainV3?: string;
  tokenSwap?: string;
  mockUSDC: string;
  mockDAI: string; 
  mockUSDT: string;
}> = {
  [SUPPORTED_CHAINS.SEPOLIA]: {
    loanChain: import.meta.env.VITE_SEPOLIA_LOANCHAIN_ADDRESS || "0xDB945F8c9b681c240d5Acb3F602D210567bDfFc6",
    loanChainV2: import.meta.env.VITE_SEPOLIA_LOANCHAIN_V2_ADDRESS || "", // Empty means V2 not deployed on Sepolia
    mockUSDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", // Sepolia USDC
    mockDAI: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",  // Sepolia DAI
    mockUSDT: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0", // Sepolia USDT
  },
  [SUPPORTED_CHAINS.HARDHAT]: {
    loanChain: "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",     // LoanChain V1 (basic version)
    loanChainV2: "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1",   // LoanChainV2 with multi-token support (LATEST)
    loanChainV3: "0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1",   // Using V2 as latest version
    tokenSwap: "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690",    // TokenSwap contract for token exchanges
    mockUSDC: "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",     // Mock USDC token
    mockDAI: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",      // Mock DAI token  
    mockUSDT: "0x59b670e9fA9D0A427751Af201D676719a970857b",     // Mock USDT token
  },
};

export const NETWORK_NAMES: Record<number, string> = {
  [SUPPORTED_CHAINS.SEPOLIA]: "Sepolia Testnet",
  [SUPPORTED_CHAINS.HARDHAT]: "Hardhat Local",
};

export const RPC_URLS: Record<number, string> = {
  [SUPPORTED_CHAINS.SEPOLIA]: "https://sepolia.infura.io/v3/demo",
  [SUPPORTED_CHAINS.HARDHAT]: "http://localhost:8000",
};

export function getContractAddress(chainId: number, version: 'v1' | 'v2' | 'v3' = 'v2'): string | null {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    console.warn(`No contracts deployed on chain ${chainId}`);
    return null;
  }
  
  // Return the requested version, fallback to v1 if version not available
  let contractAddress: string | undefined;
  switch (version) {
    case 'v3':
      contractAddress = addresses.loanChainV3;
      break;
    case 'v2':
      contractAddress = addresses.loanChainV2;
      break;
    case 'v1':
    default:
      contractAddress = addresses.loanChain;
      break;
  }
  
  if (!contractAddress) {
    console.warn(`LoanChain ${version} not deployed on chain ${chainId}`);
    // Fallback to v1 if requested version not available
    return addresses.loanChain || null;
  }
  
  return contractAddress;
}

// Helper to get the best available contract version and address
export function getPrimaryContractAddress(chainId: number): { address: string | null, version: 'v1' | 'v2' | 'v3' } {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    return { address: null, version: 'v1' };
  }
  
  // For Hardhat local network, always prefer V2 if available
  if (chainId === SUPPORTED_CHAINS.HARDHAT && addresses.loanChainV2) {
    return { address: addresses.loanChainV2, version: 'v2' };
  }
  
  // For other networks, try V2 first if it's different from V1
  if (addresses.loanChainV2 && addresses.loanChainV2 !== addresses.loanChain) {
    return { address: addresses.loanChainV2, version: 'v2' };
  }
  
  // Fallback to V1
  if (addresses.loanChain) {
    return { address: addresses.loanChain, version: 'v1' };
  }
  
  return { address: null, version: 'v1' };
}

// Helper to get V2-specific addresses
export function getV2ContractAddresses(chainId: number) {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) return null;
  
  return {
    loanChain: addresses.loanChainV2,
    tokenSwap: addresses.tokenSwap,
    tokens: {
      USDC: addresses.mockUSDC,
      DAI: addresses.mockDAI,
      USDT: addresses.mockUSDT,
    }
  };
}

export function isChainSupported(chainId: number): boolean {
  return chainId in CONTRACT_ADDRESSES;
}