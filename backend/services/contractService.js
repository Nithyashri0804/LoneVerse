import { ethers } from 'ethers';
import LoanVerseABI from '../contracts/LoanVerse.json' with { type: 'json' };

// Contract configuration
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/demo';
const CONTRACT_ADDRESS = process.env.LOANVERSE_CONTRACT_ADDRESS;

let provider;
let contract;

// Initialize contract connection
function initializeContract() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  }
  
  if (CONTRACT_ADDRESS && !contract) {
    contract = new ethers.Contract(CONTRACT_ADDRESS, LoanVerseABI.abi, provider);
  }
}

/**
 * Get borrower's historical data from the blockchain
 */
export async function getBorrowerHistory(borrowerAddress) {
  try {
    initializeContract();
    
    if (!contract) {
      // Return mock data if contract not configured
      return generateMockBorrowerHistory(borrowerAddress);
    }

    // Get credit score from contract
    const creditScore = await contract.creditScores(borrowerAddress);
    
    // Get borrower's loan IDs
    const loanIds = await contract.getBorrowerLoans(borrowerAddress);
    
    // Calculate additional metrics
    let totalBorrowed = 0;
    let totalRepaid = 0;
    let accountAge = 0;

    // For each loan, get details and calculate metrics
    for (const loanId of loanIds) {
      try {
        const loan = await contract.loans(loanId);
        totalBorrowed += Number(loan.amount);
        
        if (loan.status === 2) { // REPAID
          totalRepaid += Number(loan.amount);
        }
        
        // Calculate account age from first loan
        if (accountAge === 0 || loan.createdAt < accountAge) {
          accountAge = loan.createdAt;
        }
      } catch (error) {
        console.error(`Error fetching loan ${loanId}:`, error);
      }
    }

    // Calculate account age in days
    const currentTime = Math.floor(Date.now() / 1000);
    const ageInDays = accountAge > 0 ? (currentTime - Number(accountAge)) / (24 * 60 * 60) : 0;

    return {
      totalLoansCount: Number(creditScore.totalLoansCount),
      repaidLoansCount: Number(creditScore.repaidLoansCount),
      defaultedLoansCount: Number(creditScore.defaultedLoansCount),
      totalBorrowed: Number(creditScore.totalBorrowed),
      totalRepaid: Number(creditScore.totalRepaid),
      creditScore: Number(creditScore.score),
      accountAge: ageInDays,
      lastUpdated: Number(creditScore.lastUpdated)
    };

  } catch (error) {
    console.error('Error fetching borrower history:', error);
    return generateMockBorrowerHistory(borrowerAddress);
  }
}

/**
 * Get specific loan details
 */
export async function getLoanDetails(loanId) {
  try {
    initializeContract();
    
    if (!contract) {
      return generateMockLoanDetails(loanId);
    }

    const loan = await contract.loans(loanId);
    
    if (loan.borrower === ethers.ZeroAddress) {
      return null; // Loan doesn't exist
    }

    return {
      id: Number(loan.id),
      borrower: loan.borrower,
      lender: loan.lender,
      tokenId: Number(loan.tokenId),
      collateralTokenId: Number(loan.collateralTokenId),
      amount: Number(loan.amount),
      collateralAmount: Number(loan.collateralAmount),
      interestRate: Number(loan.interestRate),
      duration: Number(loan.duration),
      createdAt: Number(loan.createdAt),
      fundedAt: Number(loan.fundedAt),
      dueDate: Number(loan.dueDate),
      status: Number(loan.status),
      ipfsDocumentHash: loan.ipfsDocumentHash,
      riskScore: Number(loan.riskScore),
      collateralClaimed: loan.collateralClaimed
    };

  } catch (error) {
    console.error('Error fetching loan details:', error);
    return generateMockLoanDetails(loanId);
  }
}

/**
 * Get all active loan requests
 */
export async function getActiveLoans() {
  try {
    initializeContract();
    
    if (!contract) {
      return generateMockActiveLoans();
    }

    const activeLoanIds = await contract.getActiveLoanRequests();
    const loans = [];

    for (const loanId of activeLoanIds) {
      const loanDetails = await getLoanDetails(loanId);
      if (loanDetails) {
        loans.push(loanDetails);
      }
    }

    return loans;

  } catch (error) {
    console.error('Error fetching active loans:', error);
    return generateMockActiveLoans();
  }
}

/**
 * Get supported tokens
 */
export async function getSupportedTokens() {
  try {
    initializeContract();
    
    if (!contract) {
      return [
        {
          id: 0,
          tokenType: 0, // ETH
          contractAddress: ethers.ZeroAddress,
          symbol: 'ETH',
          decimals: 18,
          isActive: true
        }
      ];
    }

    // In a full implementation, we'd query the contract for all supported tokens
    // For now, return ETH as the primary supported token
    const ethToken = await contract.supportedTokens(0);
    
    return [{
      id: 0,
      tokenType: Number(ethToken.tokenType),
      contractAddress: ethToken.contractAddress,
      symbol: ethToken.symbol,
      decimals: Number(ethToken.decimals),
      isActive: ethToken.isActive
    }];

  } catch (error) {
    console.error('Error fetching supported tokens:', error);
    return [];
  }
}

// Mock data generators for development
function generateMockBorrowerHistory(address) {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(address));
  const seed = parseInt(hash.slice(2, 10), 16);
  
  const totalLoans = (seed % 10) + 1;
  const repaidLoans = Math.floor(totalLoans * (0.7 + (seed % 30) / 100));
  const defaultedLoans = totalLoans - repaidLoans;
  
  return {
    totalLoansCount: totalLoans,
    repaidLoansCount: repaidLoans,
    defaultedLoansCount: defaultedLoans,
    totalBorrowed: (seed % 1000) * 1000000, // Mock amounts
    totalRepaid: repaidLoans * 800000,
    creditScore: 300 + (seed % 500),
    accountAge: (seed % 365) + 30, // 30-395 days
    lastUpdated: Date.now() / 1000
  };
}

function generateMockLoanDetails(loanId) {
  const seed = parseInt(loanId) || 1;
  
  return {
    id: seed,
    borrower: `0x${'1'.repeat(40)}`, // Mock address
    lender: ethers.ZeroAddress,
    tokenId: 0,
    collateralTokenId: 0,
    amount: (seed % 10 + 1) * 1000000000000000000n, // 1-10 ETH
    collateralAmount: (seed % 10 + 1) * 1500000000000000000n, // 1.5x collateral
    interestRate: 500 + (seed % 1000), // 5-15%
    duration: (seed % 30 + 7) * 24 * 60 * 60, // 7-37 days
    createdAt: Date.now() / 1000 - (seed % 86400),
    fundedAt: 0,
    dueDate: 0,
    status: 0, // REQUESTED
    ipfsDocumentHash: `Qm${'x'.repeat(44)}`,
    riskScore: seed % 1000,
    collateralClaimed: false
  };
}

function generateMockActiveLoans() {
  return [
    generateMockLoanDetails(1),
    generateMockLoanDetails(2),
    generateMockLoanDetails(3)
  ];
}