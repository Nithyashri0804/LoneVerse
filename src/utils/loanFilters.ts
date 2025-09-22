import { formatEther } from 'ethers';
import { Loan } from '../types/loan';
import { LoanFilters } from '../components/LoanFilter';

export const filterLoans = (loans: Loan[], filters: LoanFilters): Loan[] => {
  return loans.filter(loan => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !loan.borrower.toLowerCase().includes(searchLower) &&
        !loan.lenders.some(lender => lender.toLowerCase().includes(searchLower)) &&
        !loan.id.toString().includes(searchLower)
      ) {
        return false;
      }
    }

    // Amount range filter
    const loanAmountEth = parseFloat(formatEther(loan.totalAmount));
    if (filters.amountMin && loanAmountEth < parseFloat(filters.amountMin)) {
      return false;
    }
    if (filters.amountMax && loanAmountEth > parseFloat(filters.amountMax)) {
      return false;
    }

    // Interest rate filter
    const interestRate = loan.interestRate / 100; // Convert from basis points to percentage
    if (filters.interestRateMin && interestRate < parseFloat(filters.interestRateMin)) {
      return false;
    }
    if (filters.interestRateMax && interestRate > parseFloat(filters.interestRateMax)) {
      return false;
    }

    // Duration filter (convert seconds to days)
    const durationDays = loan.duration / (24 * 60 * 60);
    if (filters.durationMin && durationDays < parseFloat(filters.durationMin)) {
      return false;
    }
    if (filters.durationMax && durationDays > parseFloat(filters.durationMax)) {
      return false;
    }

    return true;
  });
};

export const sortLoans = (loans: Loan[], sortBy: LoanFilters['sortBy']): Loan[] => {
  const sortedLoans = [...loans];

  switch (sortBy) {
    case 'newest':
      return sortedLoans.sort((a, b) => b.createdAt - a.createdAt);
    case 'oldest':
      return sortedLoans.sort((a, b) => a.createdAt - b.createdAt);
    case 'amount_high':
      return sortedLoans.sort((a, b) => parseFloat(formatEther(b.totalAmount)) - parseFloat(formatEther(a.totalAmount)));
    case 'amount_low':
      return sortedLoans.sort((a, b) => parseFloat(formatEther(a.totalAmount)) - parseFloat(formatEther(b.totalAmount)));
    case 'rate_low':
      return sortedLoans.sort((a, b) => a.interestRate - b.interestRate);
    case 'rate_high':
      return sortedLoans.sort((a, b) => b.interestRate - a.interestRate);
    case 'risk_low':
      // For now, use interest rate as risk proxy - can be enhanced with actual risk scores later
      return sortedLoans.sort((a, b) => a.interestRate - b.interestRate);
    case 'risk_high':
      return sortedLoans.sort((a, b) => b.interestRate - a.interestRate);
    default:
      return sortedLoans;
  }
};

export const calculateRiskScore = (loan: Loan): number => {
  // Basic risk scoring algorithm - can be enhanced with ML later
  let riskScore = 50; // Base score

  // Factor in interest rate (higher rate = higher risk)
  const interestRatePercent = loan.interestRate / 100;
  riskScore += Math.min(interestRatePercent * 2, 30);

  // Factor in loan duration (longer = higher risk)
  const durationDays = loan.duration / (24 * 60 * 60);
  if (durationDays > 365) riskScore += 20;
  else if (durationDays > 180) riskScore += 10;
  else if (durationDays > 90) riskScore += 5;

  // Factor in collateralization ratio
  const loanAmountEth = parseFloat(formatEther(loan.totalAmount));
  const collateralAmountEth = parseFloat(formatEther(loan.collateralAmount));
  const collateralizationRatio = collateralAmountEth / loanAmountEth;
  
  if (collateralizationRatio < 1.2) riskScore += 30;
  else if (collateralizationRatio < 1.5) riskScore += 15;
  else if (collateralizationRatio < 2.0) riskScore += 5;
  else riskScore -= 10;

  return Math.max(0, Math.min(100, Math.round(riskScore)));
};

export const getRiskLevel = (riskScore: number): { level: string; color: string; bgColor: string } => {
  if (riskScore <= 30) {
    return { level: 'Low Risk', color: 'text-green-400', bgColor: 'bg-green-900/20' };
  } else if (riskScore <= 60) {
    return { level: 'Medium Risk', color: 'text-yellow-400', bgColor: 'bg-yellow-900/20' };
  } else {
    return { level: 'High Risk', color: 'text-red-400', bgColor: 'bg-red-900/20' };
  }
};