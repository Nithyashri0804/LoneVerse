// Contract addresses for different networks
export const SUPPORTED_CHAINS = {
  SEPOLIA: 11155111,
  HARDHAT: 31337,
} as const;

export const CONTRACT_ADDRESSES: Record<number, { loanChain: string }> = {
  [SUPPORTED_CHAINS.SEPOLIA]: {
    loanChain: import.meta.env.VITE_SEPOLIA_LOANCHAIN_ADDRESS || "",
  },
  [SUPPORTED_CHAINS.HARDHAT]: {
    loanChain: import.meta.env.VITE_HARDHAT_LOANCHAIN_ADDRESS || "",
  },
};

export const NETWORK_NAMES: Record<number, string> = {
  [SUPPORTED_CHAINS.SEPOLIA]: "Sepolia Testnet",
  [SUPPORTED_CHAINS.HARDHAT]: "Hardhat Local",
};

export const RPC_URLS: Record<number, string> = {
  [SUPPORTED_CHAINS.SEPOLIA]: "https://sepolia.infura.io/v3/demo",
  [SUPPORTED_CHAINS.HARDHAT]: "http://localhost:8545",
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