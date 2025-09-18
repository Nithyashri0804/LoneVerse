// Contract addresses for different networks
export const SUPPORTED_CHAINS = {
  SEPOLIA: 11155111,
  HARDHAT: 31337,
} as const;

export const CONTRACT_ADDRESSES: Record<number, { 
  loanChain: string; 
  loanChainV2: string;
  tokenSwap?: string;
  mockUSDC: string;
  mockDAI: string; 
  mockUSDT: string;
}> = {
  [SUPPORTED_CHAINS.SEPOLIA]: {
    loanChain: import.meta.env.VITE_SEPOLIA_LOANCHAIN_ADDRESS || "0xDB945F8c9b681c240d5Acb3F602D210567bDfFc6",
    loanChainV2: import.meta.env.VITE_SEPOLIA_LOANCHAIN_V2_ADDRESS || "",
    mockUSDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8", // Sepolia USDC
    mockDAI: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",  // Sepolia DAI
    mockUSDT: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0", // Sepolia USDT
  },
  [SUPPORTED_CHAINS.HARDHAT]: {
    loanChain: "0x5FbDB2315678afecb367f032d93F642f64180aa3",     // Original V1 contract  
    loanChainV2: "0xc96304e3c037f81dA488ed9dEa1D8F2a48278a75",   // Complete V2 with all insurance bugs fixed
    tokenSwap: "0x3347B4d90ebe72BeFb30444C9966B2B990aE9FcB",    // Token swap contract
    mockUSDC: "0xD5ac451B0c50B9476107823Af206eD814a2e2580",     // Deployed mock USDC
    mockDAI: "0xF8e31cb472bc70500f08Cd84917E5A1912Ec8397",      // Deployed mock DAI
    mockUSDT: "0xc0F115A19107322cFBf1cDBC7ea011C19EbDB4F8",     // Deployed mock USDT
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

export function getContractAddress(chainId: number): string | null {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses || !addresses.loanChain) {
    console.warn(`LoanChain contract not deployed on chain ${chainId}`);
    return null;
  }
  return addresses.loanChain;
}

export function isChainSupported(chainId: number): boolean {
  return chainId in CONTRACT_ADDRESSES;
}