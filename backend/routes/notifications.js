import express from 'express';
import nodemailer from 'nodemailer';
import { WebSocketServer } from 'ws';

const router = express.Router();

// In-memory notification store (in production, use a database)
const notifications = new Map();
const userSubscriptions = new Map();

// Email transporter setup (configure with your email service)
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Get notifications for a user
 */
router.get('/:userAddress', (req, res) => {
  try {
    const { userAddress } = req.params;
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;
    
    const userNotifications = notifications.get(userAddress.toLowerCase()) || [];
    
    let filteredNotifications = userNotifications;
    if (unreadOnly === 'true') {
      filteredNotifications = userNotifications.filter(n => !n.read);
    }
    
    const paginatedNotifications = filteredNotifications
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({
      notifications: paginatedNotifications,
      total: filteredNotifications.length,
      unreadCount: userNotifications.filter(n => !n.read).length
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      error: 'Failed to get notifications',
      details: error.message
    });
  }
});

/**
 * Mark notification as read
 */
router.patch('/:userAddress/:notificationId/read', (req, res) => {
  try {
    const { userAddress, notificationId } = req.params;
    const userNotifications = notifications.get(userAddress.toLowerCase()) || [];
    
    const notification = userNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
    }
    
    res.json({ success: true });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ 
      error: 'Failed to mark notification as read',
      details: error.message
    });
  }
});

/**
 * Mark all notifications as read
 */
router.patch('/:userAddress/read-all', (req, res) => {
  try {
    const { userAddress } = req.params;
    const userNotifications = notifications.get(userAddress.toLowerCase()) || [];
    
    userNotifications.forEach(notification => {
      notification.read = true;
      notification.readAt = new Date().toISOString();
    });
    
    res.json({ success: true, updated: userNotifications.length });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ 
      error: 'Failed to mark all notifications as read',
      details: error.message
    });
  }
});

/**
 * Subscribe to notification types
 */
router.post('/:userAddress/subscribe', (req, res) => {
  try {
    const { userAddress } = req.params;
    const { types, email, enableEmail = false } = req.body;
    
    if (!Array.isArray(types)) {
      return res.status(400).json({ error: 'Types must be an array' });
    }
    
    const subscription = {
      userAddress: userAddress.toLowerCase(),
      types,
      email: enableEmail ? email : null,
      enableEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    userSubscriptions.set(userAddress.toLowerCase(), subscription);
    
    res.json({ success: true, subscription });

  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ 
      error: 'Failed to subscribe to notifications',
      details: error.message
    });
  }
});

/**
 * Get user subscription preferences
 */
router.get('/:userAddress/subscription', (req, res) => {
  try {
    const { userAddress } = req.params;
    const subscription = userSubscriptions.get(userAddress.toLowerCase());
    
    if (!subscription) {
      return res.json({
        types: ['loan_funded', 'repayment_due', 'loan_defaulted'],
        email: null,
        enableEmail: false
      });
    }
    
    res.json(subscription);

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ 
      error: 'Failed to get subscription preferences',
      details: error.message
    });
  }
});

/**
 * Send notification (internal API)
 */
export async function sendNotification(userAddress, notification) {
  try {
    const userAddr = userAddress.toLowerCase();
    const userNotifications = notifications.get(userAddr) || [];
    
    const newNotification = {
      id: generateNotificationId(),
      ...notification,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    userNotifications.unshift(newNotification);
    
    // Keep only last 100 notifications per user
    if (userNotifications.length > 100) {
      userNotifications.splice(100);
    }
    
    notifications.set(userAddr, userNotifications);
    
    // Check if user is subscribed to this notification type
    const subscription = userSubscriptions.get(userAddr);
    if (subscription && subscription.types.includes(notification.type)) {
      
      // Send email if enabled
      if (subscription.enableEmail && subscription.email) {
        await sendEmailNotification(subscription.email, newNotification);
      }
      
      // Send real-time notification via WebSocket (if implemented)
      // This would require WebSocket setup in the main server
    }
    
    return newNotification;

  } catch (error) {
    console.error('Send notification error:', error);
    throw error;
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(email, notification) {
  try {
    if (!process.env.SMTP_USER) {
      console.log('Email notification skipped (SMTP not configured):', notification.title);
      return;
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@loanverse.com',
      to: email,
      subject: `LoanVerse: ${notification.title}`,
      html: generateEmailTemplate(notification)
    };

    await emailTransporter.sendMail(mailOptions);
    console.log('Email notification sent:', notification.title);

  } catch (error) {
    console.error('Email notification error:', error);
  }
}

/**
 * Generate HTML email template
 */
function generateEmailTemplate(notification) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>LoanVerse Notification</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .priority-high { border-left: 4px solid #ef4444; }
        .priority-medium { border-left: 4px solid #f59e0b; }
        .priority-low { border-left: 4px solid #10b981; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌟 LoanVerse</h1>
          <p>Decentralized Lending Platform</p>
        </div>
        <div class="content priority-${notification.priority || 'medium'}">
          <h2>${notification.title}</h2>
          <p>${notification.message}</p>
          
          ${notification.actionUrl ? `
            <a href="${notification.actionUrl}" class="button">Take Action</a>
          ` : ''}
          
          ${notification.data ? `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <strong>Details:</strong><br>
              ${Object.entries(notification.data).map(([key, value]) => 
                `${key}: ${value}`
              ).join('<br>')}
            </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>This is an automated message from LoanVerse. Please do not reply to this email.</p>
          <p>© 2024 LoanVerse - Next-generation DeFi lending platform</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate unique notification ID
 */
function generateNotificationId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Predefined notification templates
export const NotificationTypes = {
  LOAN_FUNDED: 'loan_funded',
  LOAN_REPAID: 'loan_repaid',
  REPAYMENT_DUE: 'repayment_due',
  LOAN_DEFAULTED: 'loan_defaulted',
  COLLATERAL_CLAIMED: 'collateral_claimed',
  RISK_ALERT: 'risk_alert',
  FRAUD_ALERT: 'fraud_alert'
};

export const NotificationTemplates = {
  [NotificationTypes.LOAN_FUNDED]: (loanId, amount) => ({
    type: NotificationTypes.LOAN_FUNDED,
    title: 'Loan Funded Successfully',
    message: `Your loan request #${loanId} has been funded! ${amount} ETH has been transferred to your wallet.`,
    priority: 'high',
    data: { loanId, amount }
  }),
  
  [NotificationTypes.REPAYMENT_DUE]: (loanId, amount, dueDate) => ({
    type: NotificationTypes.REPAYMENT_DUE,
    title: 'Loan Repayment Due Soon',
    message: `Your loan #${loanId} repayment of ${amount} ETH is due on ${new Date(dueDate * 1000).toLocaleDateString()}.`,
    priority: 'high',
    data: { loanId, amount, dueDate }
  }),
  
  [NotificationTypes.LOAN_DEFAULTED]: (loanId, borrower) => ({
    type: NotificationTypes.LOAN_DEFAULTED,
    title: 'Loan Has Defaulted',
    message: `Loan #${loanId} has defaulted. You can now claim the collateral.`,
    priority: 'high',
    data: { loanId, borrower }
  }),
  
  [NotificationTypes.RISK_ALERT]: (loanId, riskScore, reason) => ({
    type: NotificationTypes.RISK_ALERT,
    title: 'Risk Alert for Loan',
    message: `Loan #${loanId} has been flagged with elevated risk (score: ${riskScore}). Reason: ${reason}`,
    priority: 'medium',
    data: { loanId, riskScore, reason }
  })
};

export default router;