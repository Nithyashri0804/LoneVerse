export enum LoanStatus {
  REQUESTED = 0,
  FUNDED = 1,
  REPAID = 2,
  DEFAULTED = 3,
}

export interface Loan {
  id: number;
  borrower: string;
  lender: string;
  amount: string;
  collateral: string;
  interestRate: number;
  duration: number;
  createdAt: number;
  fundedAt: number;
  dueDate: number;
  status: LoanStatus;
  collateralClaimed: boolean;
}

export interface LoanFormData {
  amount: string;
  interestRate: number;
  duration: number;
  collateral: string;
}