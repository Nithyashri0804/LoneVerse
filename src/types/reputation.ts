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