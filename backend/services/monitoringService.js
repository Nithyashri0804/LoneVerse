import cron from 'node-cron';
import { getActiveLoans, getLoanDetails, getBorrowerHistory } from './contractService.js';
import { sendNotification, NotificationTypes, NotificationTemplates } from '../routes/notifications.js';
import { calculateRiskScore, getRiskCategory } from './mlService.js';

let isMonitoringActive = false;

/**
 * Start the risk monitoring service
 */
export function startRiskMonitoring() {
  if (isMonitoringActive) {
    console.log('Risk monitoring is already active');
    return;
  }

  console.log('🔍 Starting risk monitoring service...');
  
  // Check for loan repayment due alerts every hour
  cron.schedule('0 * * * *', async () => {
    await checkRepaymentDueAlerts();
  });

  // Check for defaulted loans every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    await checkDefaultedLoans();
  });

  // Update risk scores daily at midnight
  cron.schedule('0 0 * * *', async () => {
    await updateRiskScores();
  });

  // Check for fraud patterns every 4 hours
  cron.schedule('0 */4 * * *', async () => {
    await checkFraudPatterns();
  });

  isMonitoringActive = true;
  console.log('✅ Risk monitoring service started');
}

/**
 * Stop the risk monitoring service
 */
export function stopRiskMonitoring() {
  // Note: node-cron doesn't provide easy way to stop specific tasks
  // In production, you'd store task references and destroy them
  isMonitoringActive = false;
  console.log('❌ Risk monitoring service stopped');
}

/**
 * Check for loans with upcoming repayment due dates
 */
async function checkRepaymentDueAlerts() {
  try {
    console.log('🔍 Checking for repayment due alerts...');
    
    const activeLoans = await getActiveLoans();
    const currentTime = Date.now() / 1000;
    
    for (const loan of activeLoans) {
      if (loan.status === 1 && loan.dueDate > 0) { // FUNDED status
        const timeUntilDue = loan.dueDate - currentTime;
        const oneDayInSeconds = 24 * 60 * 60;
        const threeDaysInSeconds = 3 * 24 * 60 * 60;
        
        // Send alerts at 3 days, 1 day, and 6 hours before due
        if (timeUntilDue <= threeDaysInSeconds && timeUntilDue > oneDayInSeconds) {
          await sendRepaymentAlert(loan, '3 days');
        } else if (timeUntilDue <= oneDayInSeconds && timeUntilDue > 6 * 60 * 60) {
          await sendRepaymentAlert(loan, '1 day');
        } else if (timeUntilDue <= 6 * 60 * 60 && timeUntilDue > 0) {
          await sendRepaymentAlert(loan, '6 hours');
        }
      }
    }
    
  } catch (error) {
    console.error('Error checking repayment due alerts:', error);
  }
}

/**
 * Check for defaulted loans
 */
async function checkDefaultedLoans() {
  try {
    console.log('🔍 Checking for defaulted loans...');
    
    const activeLoans = await getActiveLoans();
    const currentTime = Date.now() / 1000;
    
    for (const loan of activeLoans) {
      if (loan.status === 1 && loan.dueDate > 0 && currentTime > loan.dueDate) {
        // Loan has defaulted
        await sendDefaultAlert(loan);
      }
    }
    
  } catch (error) {
    console.error('Error checking defaulted loans:', error);
  }
}

/**
 * Update risk scores for all active loans
 */
async function updateRiskScores() {
  try {
    console.log('📊 Updating risk scores...');
    
    const activeLoans = await getActiveLoans();
    
    for (const loan of activeLoans) {
      try {
        // Get updated borrower history
        const borrowerHistory = await getBorrowerHistory(loan.borrower);
        
        // Recalculate risk score
        const newRiskScore = calculateRiskScore(borrowerHistory, loan);
        const previousRiskScore = loan.riskScore || 500;
        
        // Check if risk score has changed significantly
        const riskDifference = Math.abs(newRiskScore - previousRiskScore);
        if (riskDifference > 100) { // Significant change threshold
          await sendRiskScoreAlert(loan, previousRiskScore, newRiskScore);
        }
        
        // TODO: Update risk score in smart contract
        // This would require a transaction to the contract's updateRiskScore function
        
      } catch (error) {
        console.error(`Error updating risk score for loan ${loan.id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error updating risk scores:', error);
  }
}

/**
 * Check for potential fraud patterns
 */
async function checkFraudPatterns() {
  try {
    console.log('🔍 Checking for fraud patterns...');
    
    const activeLoans = await getActiveLoans();
    
    // Group loans by borrower address
    const borrowerLoans = new Map();
    activeLoans.forEach(loan => {
      if (!borrowerLoans.has(loan.borrower)) {
        borrowerLoans.set(loan.borrower, []);
      }
      borrowerLoans.get(loan.borrower).push(loan);
    });
    
    // Check for suspicious patterns
    for (const [borrower, loans] of borrowerLoans) {
      const suspiciousPatterns = detectFraudPatterns(loans);
      
      if (suspiciousPatterns.length > 0) {
        await sendFraudAlert(borrower, suspiciousPatterns);
      }
    }
    
  } catch (error) {
    console.error('Error checking fraud patterns:', error);
  }
}

/**
 * Send repayment due alert
 */
async function sendRepaymentAlert(loan, timeFrame) {
  try {
    const notification = NotificationTemplates[NotificationTypes.REPAYMENT_DUE](
      loan.id,
      (Number(loan.amount) / 1e18).toFixed(4) + ' ETH',
      loan.dueDate
    );
    
    notification.message = `Your loan #${loan.id} repayment is due in ${timeFrame}. ` + notification.message;
    
    await sendNotification(loan.borrower, notification);
    console.log(`📧 Sent repayment alert for loan ${loan.id} (due in ${timeFrame})`);
    
  } catch (error) {
    console.error(`Error sending repayment alert for loan ${loan.id}:`, error);
  }
}

/**
 * Send default alert to lender
 */
async function sendDefaultAlert(loan) {
  try {
    const notification = NotificationTemplates[NotificationTypes.LOAN_DEFAULTED](
      loan.id,
      loan.borrower
    );
    
    await sendNotification(loan.lender, notification);
    console.log(`📧 Sent default alert for loan ${loan.id}`);
    
  } catch (error) {
    console.error(`Error sending default alert for loan ${loan.id}:`, error);
  }
}

/**
 * Send risk score change alert
 */
async function sendRiskScoreAlert(loan, previousScore, newScore) {
  try {
    const direction = newScore > previousScore ? 'increased' : 'decreased';
    const change = Math.abs(newScore - previousScore);
    
    const notification = NotificationTemplates[NotificationTypes.RISK_ALERT](
      loan.id,
      newScore,
      `Risk score ${direction} by ${change} points`
    );
    
    // Send to both borrower and lender
    await sendNotification(loan.borrower, notification);
    if (loan.lender !== '0x0000000000000000000000000000000000000000') {
      await sendNotification(loan.lender, notification);
    }
    
    console.log(`📊 Sent risk score alert for loan ${loan.id} (${previousScore} → ${newScore})`);
    
  } catch (error) {
    console.error(`Error sending risk score alert for loan ${loan.id}:`, error);
  }
}

/**
 * Send fraud alert
 */
async function sendFraudAlert(borrower, patterns) {
  try {
    const notification = {
      type: NotificationTypes.FRAUD_ALERT,
      title: 'Suspicious Activity Detected',
      message: `Potential fraud patterns detected for borrower ${borrower}: ${patterns.join(', ')}`,
      priority: 'high',
      data: { borrower, patterns }
    };
    
    // In production, this would notify platform administrators
    console.log(`🚨 FRAUD ALERT: ${borrower} - ${patterns.join(', ')}`);
    
  } catch (error) {
    console.error(`Error sending fraud alert for borrower ${borrower}:`, error);
  }
}

/**
 * Detect potential fraud patterns
 */
function detectFraudPatterns(loans) {
  const patterns = [];
  
  // Pattern 1: Multiple loans requested in short time frame
  const recentLoans = loans.filter(loan => {
    const oneDayAgo = Date.now() / 1000 - 24 * 60 * 60;
    return loan.createdAt > oneDayAgo;
  });
  
  if (recentLoans.length > 3) {
    patterns.push('Multiple loan requests in 24 hours');
  }
  
  // Pattern 2: Unusually high loan amounts
  const avgLoanAmount = loans.reduce((sum, loan) => sum + Number(loan.amount), 0) / loans.length;
  const largeLoans = loans.filter(loan => Number(loan.amount) > avgLoanAmount * 3);
  
  if (largeLoans.length > 0) {
    patterns.push('Unusually large loan amounts');
  }
  
  // Pattern 3: Low collateral ratios
  const lowCollateralLoans = loans.filter(loan => {
    const ratio = Number(loan.collateralAmount) / Number(loan.amount);
    return ratio < 1.2; // Below 120%
  });
  
  if (lowCollateralLoans.length > 1) {
    patterns.push('Multiple loans with low collateral ratios');
  }
  
  // Pattern 4: Same IPFS document hash across multiple loans
  const documentHashes = loans.map(loan => loan.ipfsDocumentHash).filter(hash => hash);
  const uniqueHashes = new Set(documentHashes);
  
  if (documentHashes.length > uniqueHashes.size && documentHashes.length > 1) {
    patterns.push('Reused loan documents');
  }
  
  return patterns;
}

/**
 * Get monitoring status
 */
export function getMonitoringStatus() {
  return {
    isActive: isMonitoringActive,
    services: [
      'Repayment Due Alerts',
      'Default Detection',
      'Risk Score Updates',
      'Fraud Pattern Detection'
    ]
  };
}