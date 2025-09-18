import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      console.log('📧 Email service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  async sendLoanFundedEmail(recipientEmail, loanDetails) {
    const { loanId, amount, lender, borrower, interestRate, duration } = loanDetails;
    
    const subject = `Loan #${loanId} has been funded - LoanVerse`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1f2937; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #3b82f6;">LoanVerse</h1>
          <p style="margin: 5px 0 0 0; color: #9ca3af;">Decentralized P2P Lending</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #059669; margin-top: 0;">🎉 Loan Successfully Funded!</h2>
          
          <p>Great news! Your loan request has been funded.</p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Loan ID:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">#${loanId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Amount:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${amount} ETH</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Interest Rate:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${interestRate}%</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Duration:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${duration} days</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Lender:</strong></td>
                <td style="padding: 8px 0;">${lender}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #d97706; margin-top: 0;">⚠️ Important Reminders</h3>
            <ul style="margin: 0; color: #92400e;">
              <li>Remember to repay your loan before the due date to avoid default</li>
              <li>Your collateral will be at risk if you fail to repay on time</li>
              <li>You can repay early without penalties</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View in LoanVerse
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>You're receiving this because you have notifications enabled on LoanVerse.</p>
          <p>© 2024 LoanVerse. Next-generation DeFi lending platform.</p>
        </div>
      </div>
    `;

    return this.sendEmail(recipientEmail, subject, html);
  }

  async sendLoanRepaidEmail(recipientEmail, loanDetails) {
    const { loanId, amount, totalRepaid, borrower, lender } = loanDetails;
    
    const subject = `Loan #${loanId} has been repaid - LoanVerse`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1f2937; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #3b82f6;">LoanVerse</h1>
          <p style="margin: 5px 0 0 0; color: #9ca3af;">Decentralized P2P Lending</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #059669; margin-top: 0;">✅ Loan Successfully Repaid!</h2>
          
          <p>Excellent! The loan has been successfully repaid.</p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Loan ID:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">#${loanId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Original Amount:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${amount} ETH</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Total Repaid:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${totalRepaid} ETH</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Borrower:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${borrower}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Lender:</strong></td>
                <td style="padding: 8px 0;">${lender}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}" 
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View in LoanVerse
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>You're receiving this because you have notifications enabled on LoanVerse.</p>
          <p>© 2024 LoanVerse. Next-generation DeFi lending platform.</p>
        </div>
      </div>
    `;

    return this.sendEmail(recipientEmail, subject, html);
  }

  async sendLoanDueReminderEmail(recipientEmail, loanDetails) {
    const { loanId, amount, totalRepayment, dueDate, hoursRemaining } = loanDetails;
    
    const subject = `⏰ Loan #${loanId} due soon - LoanVerse`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1f2937; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #3b82f6;">LoanVerse</h1>
          <p style="margin: 5px 0 0 0; color: #9ca3af;">Decentralized P2P Lending</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #d97706; margin-top: 0;">⏰ Loan Payment Due Soon!</h2>
          
          <p>This is a friendly reminder that your loan payment is due soon.</p>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #d97706; margin-top: 0;">⚠️ Payment Required</h3>
            <p style="margin: 0; color: #92400e; font-size: 16px;">
              <strong>Due in ${hoursRemaining} hours</strong><br>
              Due Date: ${new Date(dueDate * 1000).toLocaleDateString()}
            </p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Loan ID:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">#${loanId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Original Amount:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${amount} ETH</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Total Repayment:</strong></td>
                <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${totalRepayment} ETH</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef2f2; border: 1px solid #ef4444; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">⚠️ Important Warning</h3>
            <p style="margin: 0; color: #b91c1c;">
              Failure to repay your loan on time will result in default and your collateral will be claimed by the lender.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}" 
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Repay Loan Now
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
          <p>You're receiving this because you have notifications enabled on LoanVerse.</p>
          <p>© 2024 LoanVerse. Next-generation DeFi lending platform.</p>
        </div>
      </div>
    `;

    return this.sendEmail(recipientEmail, subject, html);
  }

  async sendEmail(to, subject, html) {
    if (!this.transporter) {
      console.warn('📧 Email transporter not initialized');
      return { success: false, error: 'Email service not configured' };
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('📧 Email credentials not configured');
      return { success: false, error: 'Email credentials not configured' };
    }

    try {
      const mailOptions = {
        from: `"LoanVerse" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent: ${info.messageId}`);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    if (!this.transporter) {
      return { success: false, error: 'Email transporter not initialized' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service connection verified' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();