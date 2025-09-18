export enum LoanStatus {
  REQUESTED = 0,
  FUNDED = 1,
  PARTIALLY_FUNDED = 2,
  REPAID = 3,
  DEFAULTED = 4,
  CANCELLED = 5,
}

export enum TokenType {
  NATIVE_ETH = 0,
  USDC = 1,
  DAI = 2,
  USDT = 3,
  GOVERNANCE_TOKEN = 4,
}

export interface Token {
  contractAddress: string;
  tokenType: TokenType;
  decimals: number;
  isActive: boolean;
  minLoanAmount: string;
  maxLoanAmount: string;
  symbol: string;
  name: string;
  price: string; // USD price with 8 decimals
}

export interface LenderPosition {
  lender: string;
  amount: string;
  fundedAt: number;
  repaid: boolean;
  repaidAmount: string;
}

export interface Loan {
  id: number;
  borrower: string;
  lenders: string[];
  lenderAmounts: string[];
  totalAmount: string;
  totalFunded: string;
  loanToken: TokenType;
  collateralToken: TokenType;
  collateralAmount: string;
  interestRate: number;
  isVariableRate: boolean;
  duration: number;
  createdAt: number;
  fundedAt: number;
  dueDate: number;
  status: LoanStatus;
  collateralClaimed: boolean;
  riskScore: number;
  hasInsurance: boolean;
  insuranceFee: string;
}

export interface LoanFormData {
  totalAmount: string;
  loanToken: TokenType;
  collateralToken: TokenType;
  collateralAmount: string;
  interestRate: number;
  duration: number;
  isVariableRate: boolean;
  hasInsurance: boolean;
}

export interface FundingData {
  loanId: number;
  amount: string;
}

// Token configuration for different networks
export const TOKEN_ADDRESSES: Record<number, Record<TokenType, string>> = {
  // Hardhat local network
  31337: {
    [TokenType.NATIVE_ETH]: '0x0000000000000000000000000000000000000000',
    [TokenType.USDC]: '0x4826533B4897376654Bb4d4AD88B7faFD0C98528', // Deployed mock USDC
    [TokenType.DAI]: '0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf',  // Deployed mock DAI
    [TokenType.USDT]: '0x0E801D84Fa97b50751Dbf25036d067dCf18858bF', // Deployed mock USDT
    [TokenType.GOVERNANCE_TOKEN]: '',
  },
  // Sepolia testnet
  11155111: {
    [TokenType.NATIVE_ETH]: '0x0000000000000000000000000000000000000000',
    [TokenType.USDC]: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', // Sepolia USDC
    [TokenType.DAI]: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',  // Sepolia DAI
    [TokenType.USDT]: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', // Sepolia USDT
    [TokenType.GOVERNANCE_TOKEN]: '',
  },
};

export const TOKEN_INFO: Record<TokenType, Omit<Token, 'contractAddress' | 'price'>> = {
  [TokenType.NATIVE_ETH]: {
    tokenType: TokenType.NATIVE_ETH,
    decimals: 18,
    isActive: true,
    minLoanAmount: '10000000000000000', // 0.01 ETH
    maxLoanAmount: '1000000000000000000000', // 1000 ETH
    symbol: 'ETH',
    name: 'Ethereum',
  },
  [TokenType.USDC]: {
    tokenType: TokenType.USDC,
    decimals: 6,
    isActive: true,
    minLoanAmount: '10000000', // 10 USDC
    maxLoanAmount: '2500000000000', // 2,500,000 USDC
    symbol: 'USDC',
    name: 'USD Coin',
  },
  [TokenType.DAI]: {
    tokenType: TokenType.DAI,
    decimals: 18,
    isActive: true,
    minLoanAmount: '10000000000000000000', // 10 DAI
    maxLoanAmount: '2500000000000000000000000', // 2,500,000 DAI
    symbol: 'DAI',
    name: 'Dai Stablecoin',
  },
  [TokenType.USDT]: {
    tokenType: TokenType.USDT,
    decimals: 6,
    isActive: true,
    minLoanAmount: '10000000', // 10 USDT
    maxLoanAmount: '2500000000000', // 2,500,000 USDT
    symbol: 'USDT',
    name: 'Tether USD',
  },
  [TokenType.GOVERNANCE_TOKEN]: {
    tokenType: TokenType.GOVERNANCE_TOKEN,
    decimals: 18,
    isActive: false, // Will be activated later
    minLoanAmount: '0',
    maxLoanAmount: '0',
    symbol: 'LCT',
    name: 'LoanChain Token',
  },
};