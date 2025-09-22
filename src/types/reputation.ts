export interface BorrowerReputation {
  address: string;
  totalLoans: number;
  successfulLoans: number;
  defaultedLoans: number;
  totalBorrowed: string;
  totalRepaid: string;
  averageRepaymentTime: number; // in days
  repaymentRate: number; // percentage
  creditScore: number; // 0-100
  riskLevel: 'Low' | 'Medium' | 'High';
  isVerified: boolean;
  verificationBadges: string[];
  joinedDate: number;
  lastActivityDate: number;
  onTimePayments: number;
  latePayments: number;
}

export interface LenderRating {
  address: string;
  totalLoans: number;
  averageInterestRate: number;
  fairnessScore: number; // 0-100
  responsiveness: number; // 0-100
  totalVolumeProvided: string;
  rating: number; // 0-5 stars
  reviews: LenderReview[];
}

export interface LenderReview {
  id: string;
  borrowerAddress: string;
  loanId: number;
  rating: number; // 1-5
  comment: string;
  timestamp: number;
  verified: boolean;
}

export interface VerificationBadge {
  type: 'kyc' | 'address' | 'social' | 'employment' | 'income' | 'experience';
  name: string;
  description: string;
  verifiedAt: number;
  expiry?: number;
}

export interface CreditHistoryEntry {
  timestamp: number;
  action: 'LOAN_REQUESTED' | 'LOAN_FUNDED' | 'LOAN_REPAID' | 'LOAN_DEFAULTED' | 'COLLATERAL_CLAIMED';
  loanId: number;
  amount: string;
  creditScoreChange: number;
  newCreditScore: number;
  details: string;
}

export interface ReputationMetrics {
  trustworthiness: number; // 0-100 based on repayment history
  reliability: number; // 0-100 based on consistency
  experience: number; // 0-100 based on volume and time
  efficiency: number; // 0-100 based on repayment speed
  riskProfile: 'Conservative' | 'Moderate' | 'Aggressive';
  reputationTrend: 'Improving' | 'Stable' | 'Declining';
}

export interface EnhancedReputationData {
  address: string;
  creditScore: number;
  totalLoans: number;
  repaidLoans: number;
  defaultedLoans: number;
  avgRepaymentTime: number;
  onTimePayments: number;
  latePayments: number;
  totalVolumeUSD: number;
  reputationRank: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  consecutiveOnTimePayments: number;
  timeAsLender: number;
  timeAsBorrower: number;
  averageLoanSize: number;
  riskAdjustedReturns: number;
  platformLoyalty: number;
  socialCredibility: number;
  creditHistory: CreditHistoryEntry[];
  metrics: ReputationMetrics;
  verificationBadges: VerificationBadge[];
  reputationScore: number; // Overall reputation 0-1000
}