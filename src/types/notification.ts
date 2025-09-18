export enum NotificationType {
  LOAN_FUNDED = 'loan_funded',
  LOAN_REPAID = 'loan_repaid',
  LOAN_DEFAULTED = 'loan_defaulted',
  LOAN_DUE_SOON = 'loan_due_soon',
  LOAN_OVERDUE = 'loan_overdue',
  NEW_LOAN_REQUEST = 'new_loan_request',
  COLLATERAL_CLAIMED = 'collateral_claimed'
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  urgent: boolean;
  loanId?: number;
  amount?: string;
  userAddress?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  urgent: number;
}