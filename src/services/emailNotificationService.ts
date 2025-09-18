import { formatEther } from 'ethers';

interface LoanDetails {
  loanId: number;
  amount: string;
  interestRate: number;
  duration: number;
  borrower: string;
  lender: string;
}

class EmailNotificationService {
  private baseUrl = '/api/email-notifications/internal';

  async sendLoanFundedNotification(userAddress: string, loanDetails: LoanDetails) {
    try {
      const response = await fetch(`${this.baseUrl}/send/loan-funded`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          loanDetails: {
            loanId: loanDetails.loanId,
            amount: parseFloat(formatEther(loanDetails.amount)).toFixed(4),
            interestRate: (loanDetails.interestRate / 100).toFixed(1),
            duration: Math.round(loanDetails.duration / (24 * 60 * 60)),
            borrower: loanDetails.borrower,
            lender: loanDetails.lender
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send loan funded email notification:', error);
      return { success: false, error: 'Failed to send email notification' };
    }
  }

  async sendLoanRepaidNotification(userAddress: string, loanDetails: LoanDetails, totalRepaid: string) {
    try {
      const response = await fetch(`${this.baseUrl}/send/loan-repaid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          loanDetails: {
            loanId: loanDetails.loanId,
            amount: parseFloat(formatEther(loanDetails.amount)).toFixed(4),
            totalRepaid: parseFloat(formatEther(totalRepaid)).toFixed(4),
            borrower: loanDetails.borrower,
            lender: loanDetails.lender
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send loan repaid email notification:', error);
      return { success: false, error: 'Failed to send email notification' };
    }
  }

  async sendLoanDueReminderNotification(userAddress: string, loanDetails: LoanDetails, dueDate: number) {
    try {
      const hoursRemaining = Math.max(0, Math.floor((dueDate * 1000 - Date.now()) / (1000 * 60 * 60)));
      const totalRepayment = parseFloat(formatEther(loanDetails.amount)) * (1 + loanDetails.interestRate / 10000);

      const response = await fetch(`${this.baseUrl}/send/loan-due-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          loanDetails: {
            loanId: loanDetails.loanId,
            amount: parseFloat(formatEther(loanDetails.amount)).toFixed(4),
            totalRepayment: totalRepayment.toFixed(4),
            dueDate: dueDate,
            hoursRemaining: hoursRemaining
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send loan due reminder email notification:', error);
      return { success: false, error: 'Failed to send email notification' };
    }
  }
}

export default new EmailNotificationService();