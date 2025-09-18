import express from 'express';
import EmailService from '../services/emailService.js';

const router = express.Router();

// User preferences storage (in production, this would be in a database)
const userEmailPreferences = new Map();

// Get user email notification preferences
router.get('/preferences/:address', (req, res) => {
  try {
    const { address } = req.params;
    const preferences = userEmailPreferences.get(address.toLowerCase()) || {
      emailEnabled: false,
      email: '',
      notifyOnFunded: true,
      notifyOnRepaid: true,
      notifyOnDueSoon: true,
      notifyOnDefault: true
    };

    res.json({ success: true, preferences });
  } catch (error) {
    console.error('Error getting email preferences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user email notification preferences
router.post('/preferences/:address', (req, res) => {
  try {
    const { address } = req.params;
    const preferences = req.body;

    // Validate email if provided
    if (preferences.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(preferences.email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    userEmailPreferences.set(address.toLowerCase(), preferences);
    
    res.json({ success: true, message: 'Email preferences updated successfully' });
  } catch (error) {
    console.error('Error updating email preferences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Internal endpoint - send loan funded notification (not public)
router.post('/internal/send/loan-funded', async (req, res) => {
  try {
    const { userAddress, loanDetails } = req.body;
    
    if (!userAddress || !loanDetails) {
      return res.status(400).json({ success: false, error: 'User address and loan details are required' });
    }

    // Get user preferences
    const preferences = userEmailPreferences.get(userAddress.toLowerCase());
    if (!preferences?.emailEnabled || !preferences?.email || !preferences?.notifyOnFunded) {
      return res.json({ success: true, message: 'Email notifications not enabled for this event' });
    }

    const result = await EmailService.sendLoanFundedEmail(preferences.email, loanDetails);
    res.json(result);
  } catch (error) {
    console.error('Error sending loan funded email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Internal endpoint - send loan repaid notification (not public)
router.post('/internal/send/loan-repaid', async (req, res) => {
  try {
    const { userAddress, loanDetails } = req.body;
    
    if (!userAddress || !loanDetails) {
      return res.status(400).json({ success: false, error: 'User address and loan details are required' });
    }

    // Get user preferences
    const preferences = userEmailPreferences.get(userAddress.toLowerCase());
    if (!preferences?.emailEnabled || !preferences?.email || !preferences?.notifyOnRepaid) {
      return res.json({ success: true, message: 'Email notifications not enabled for this event' });
    }

    const result = await EmailService.sendLoanRepaidEmail(preferences.email, loanDetails);
    res.json(result);
  } catch (error) {
    console.error('Error sending loan repaid email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Internal endpoint - send loan due reminder (not public)
router.post('/internal/send/loan-due-reminder', async (req, res) => {
  try {
    const { userAddress, loanDetails } = req.body;
    
    if (!userAddress || !loanDetails) {
      return res.status(400).json({ success: false, error: 'User address and loan details are required' });
    }

    // Get user preferences
    const preferences = userEmailPreferences.get(userAddress.toLowerCase());
    if (!preferences?.emailEnabled || !preferences?.email || !preferences?.notifyOnDueSoon) {
      return res.json({ success: true, message: 'Email notifications not enabled for this event' });
    }

    const result = await EmailService.sendLoanDueReminderEmail(preferences.email, loanDetails);
    res.json(result);
  } catch (error) {
    console.error('Error sending loan due reminder email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test email configuration
router.get('/test', async (req, res) => {
  try {
    const result = await EmailService.testConnection();
    res.json(result);
  } catch (error) {
    console.error('Error testing email connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send test email - basic validation only
router.post('/test-send', async (req, res) => {
  try {
    const { email, userAddress } = req.body;
    
    if (!email || !userAddress) {
      return res.status(400).json({ success: false, error: 'Email address and user address are required' });
    }

    // Verify the user has set preferences for this address (basic ownership check)
    const preferences = userEmailPreferences.get(userAddress.toLowerCase());
    if (!preferences || preferences.email !== email) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Email does not match preferences for this address' });
    }

    const result = await EmailService.sendEmail(
      email,
      'Test Email from LoanVerse',
      `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #3b82f6;">✅ Email Test Successful!</h2>
        <p>If you're reading this, your LoanVerse email notifications are working correctly.</p>
        <p style="color: #6b7280; font-size: 12px;">© 2024 LoanVerse</p>
      </div>`
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;