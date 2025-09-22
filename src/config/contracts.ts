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
    loanChain: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",     // LoanChain V1 (legacy)
    loanChainV2: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",   // LoanChainV2 (primary)
    loanChainV3: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",   // Using V2 address for now
    tokenSwap: "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0",    // TokenSwap contract for token exchanges
    mockUSDC: "0x5FbDB2315678afecb367f032d93F642f64180aa3",     // Mock USDC token
    mockDAI: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",      // Mock DAI token
    mockUSDT: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",     // Mock USDT token
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