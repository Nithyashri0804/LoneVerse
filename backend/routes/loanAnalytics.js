import express from 'express';
import { getActiveLoans, getLoanDetails, getSupportedTokens } from '../services/contractService.js';

const router = express.Router();

/**
 * Get platform analytics overview
 */
router.get('/overview', async (req, res) => {
  try {
    const activeLoans = await getActiveLoans();
    const supportedTokens = await getSupportedTokens();
    
    // Calculate metrics
    const totalActiveLoans = activeLoans.length;
    const totalValueLocked = activeLoans.reduce((sum, loan) => sum + Number(loan.amount), 0);
    const averageInterestRate = activeLoans.length > 0 ? 
      activeLoans.reduce((sum, loan) => sum + loan.interestRate, 0) / activeLoans.length : 0;
    
    // Risk distribution
    const riskDistribution = calculateRiskDistribution(activeLoans);
    
    // Mock historical data for trends
    const trends = generateTrendData();
    
    res.json({
      overview: {
        totalActiveLoans,
        totalValueLocked: totalValueLocked.toString(),
        averageInterestRate: Math.round(averageInterestRate),
        supportedTokens: supportedTokens.length,
        platformHealth: calculatePlatformHealth(activeLoans)
      },
      riskDistribution,
      trends,
      recentActivity: activeLoans.slice(0, 5)
    });

  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ 
      error: 'Failed to get analytics overview',
      details: error.message
    });
  }
});

/**
 * Get loan statistics
 */
router.get('/loans/stats', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const activeLoans = await getActiveLoans();
    
    // Calculate statistics
    const stats = {
      total: activeLoans.length,
      byStatus: {
        requested: activeLoans.filter(l => l.status === 0).length,
        funded: activeLoans.filter(l => l.status === 1).length,
        repaid: activeLoans.filter(l => l.status === 2).length,
        defaulted: activeLoans.filter(l => l.status === 3).length
      },
      byRiskCategory: calculateRiskStats(activeLoans),
      averageAmount: activeLoans.length > 0 ? 
        activeLoans.reduce((sum, l) => sum + Number(l.amount), 0) / activeLoans.length : 0,
      averageDuration: activeLoans.length > 0 ?
        activeLoans.reduce((sum, l) => sum + l.duration, 0) / activeLoans.length : 0,
      collateralizationRatio: calculateAverageCollateralizationRatio(activeLoans)
    };

    // Generate time series data
    const timeSeries = generateTimeSeriesData(period);

    res.json({
      period,
      stats,
      timeSeries
    });

  } catch (error) {
    console.error('Loan stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get loan statistics',
      details: error.message
    });
  }
});

/**
 * Get specific loan analytics
 */
router.get('/loans/:loanId/analytics', async (req, res) => {
  try {
    const { loanId } = req.params;
    
    const loanDetails = await getLoanDetails(loanId);
    if (!loanDetails) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Calculate loan-specific analytics
    const analytics = {
      performance: calculateLoanPerformance(loanDetails),
      riskMetrics: calculateLoanRiskMetrics(loanDetails),
      timeline: generateLoanTimeline(loanDetails),
      predictions: generateLoanPredictions(loanDetails)
    };

    res.json({
      loanId,
      analytics
    });

  } catch (error) {
    console.error('Loan analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to get loan analytics',
      details: error.message
    });
  }
});

/**
 * Get borrower analytics
 */
router.get('/borrowers/:address/analytics', async (req, res) => {
  try {
    const { address } = req.params;
    
    // This would typically aggregate data from multiple sources
    const borrowerAnalytics = {
      creditProfile: {
        score: 750,
        trend: 'improving',
        factors: ['Good repayment history', 'Diverse loan portfolio']
      },
      loanHistory: {
        totalLoans: 15,
        successfulRepayments: 14,
        averageAmount: '2.5 ETH',
        preferredDuration: '30 days'
      },
      riskAssessment: {
        currentRisk: 'Low',
        riskScore: 250,
        recommendedTerms: {
          maxLoanAmount: '10 ETH',
          suggestedInterestRate: '8%',
          recommendedDuration: '30-60 days'
        }
      }
    };

    res.json(borrowerAnalytics);

  } catch (error) {
    console.error('Borrower analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to get borrower analytics',
      details: error.message
    });
  }
});

// Helper functions

function calculateRiskDistribution(loans) {
  const distribution = { low: 0, medium: 0, high: 0, veryHigh: 0 };
  
  loans.forEach(loan => {
    const score = loan.riskScore || 500;
    if (score <= 300) distribution.low++;
    else if (score <= 600) distribution.medium++;
    else if (score <= 800) distribution.high++;
    else distribution.veryHigh++;
  });
  
  return distribution;
}

function calculatePlatformHealth(loans) {
  if (loans.length === 0) return 'Excellent';
  
  const avgRisk = loans.reduce((sum, l) => sum + (l.riskScore || 500), 0) / loans.length;
  
  if (avgRisk <= 400) return 'Excellent';
  if (avgRisk <= 600) return 'Good';
  if (avgRisk <= 750) return 'Fair';
  return 'Needs Attention';
}

function calculateRiskStats(loans) {
  const stats = { low: 0, medium: 0, high: 0, veryHigh: 0 };
  
  loans.forEach(loan => {
    const score = loan.riskScore || 500;
    if (score <= 300) stats.low++;
    else if (score <= 600) stats.medium++;
    else if (score <= 800) stats.high++;
    else stats.veryHigh++;
  });
  
  return stats;
}

function calculateAverageCollateralizationRatio(loans) {
  if (loans.length === 0) return 0;
  
  const totalRatio = loans.reduce((sum, loan) => {
    return sum + (Number(loan.collateralAmount) / Number(loan.amount));
  }, 0);
  
  return totalRatio / loans.length;
}

function calculateLoanPerformance(loan) {
  const currentTime = Date.now() / 1000;
  const timeElapsed = currentTime - loan.createdAt;
  const totalDuration = loan.duration;
  const progressPercentage = Math.min((timeElapsed / totalDuration) * 100, 100);
  
  return {
    status: loan.status,
    progressPercentage: Math.round(progressPercentage),
    timeRemaining: Math.max(0, loan.dueDate - currentTime),
    isOverdue: loan.dueDate > 0 && currentTime > loan.dueDate
  };
}

function calculateLoanRiskMetrics(loan) {
  return {
    riskScore: loan.riskScore || 500,
    collateralizationRatio: Number(loan.collateralAmount) / Number(loan.amount),
    interestRate: loan.interestRate,
    duration: loan.duration,
    riskCategory: loan.riskScore <= 300 ? 'Low' : 
                 loan.riskScore <= 600 ? 'Medium' : 
                 loan.riskScore <= 800 ? 'High' : 'Very High'
  };
}

function generateLoanTimeline(loan) {
  const timeline = [
    {
      event: 'Loan Requested',
      timestamp: loan.createdAt,
      status: 'completed'
    }
  ];
  
  if (loan.fundedAt > 0) {
    timeline.push({
      event: 'Loan Funded',
      timestamp: loan.fundedAt,
      status: 'completed'
    });
  }
  
  if (loan.status === 2) {
    timeline.push({
      event: 'Loan Repaid',
      timestamp: loan.dueDate,
      status: 'completed'
    });
  } else if (loan.status === 3) {
    timeline.push({
      event: 'Loan Defaulted',
      timestamp: loan.dueDate,
      status: 'failed'
    });
  }
  
  return timeline;
}

function generateLoanPredictions(loan) {
  const riskScore = loan.riskScore || 500;
  
  let repaymentProbability = 0.9;
  if (riskScore > 600) repaymentProbability = 0.7;
  if (riskScore > 800) repaymentProbability = 0.4;
  
  return {
    repaymentProbability: Math.round(repaymentProbability * 100),
    riskLevel: riskScore <= 300 ? 'Low' : 
               riskScore <= 600 ? 'Medium' : 
               riskScore <= 800 ? 'High' : 'Very High',
    recommendedActions: generateRecommendedActions(loan, riskScore)
  };
}

function generateRecommendedActions(loan, riskScore) {
  const actions = [];
  
  if (riskScore > 700) {
    actions.push('Monitor closely for early warning signs');
    actions.push('Consider contacting borrower for status update');
  }
  
  if (riskScore > 800) {
    actions.push('Prepare for potential default scenario');
    actions.push('Review collateral liquidation procedures');
  }
  
  if (loan.status === 1 && Date.now() / 1000 > loan.dueDate * 0.9) {
    actions.push('Send repayment reminder to borrower');
  }
  
  return actions;
}

function generateTrendData() {
  const days = 30;
  const trends = [];
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    trends.push({
      date: date.toISOString().split('T')[0],
      totalLoans: Math.floor(50 + Math.random() * 20),
      totalVolume: Math.floor(1000 + Math.random() * 500),
      averageInterestRate: 5 + Math.random() * 5,
      defaultRate: Math.random() * 0.05
    });
  }
  
  return trends;
}

function generateTimeSeriesData(period) {
  const dataPoints = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const series = [];
  
  for (let i = dataPoints; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    series.push({
      date: date.toISOString().split('T')[0],
      newLoans: Math.floor(Math.random() * 10) + 1,
      fundedLoans: Math.floor(Math.random() * 8) + 1,
      repaidLoans: Math.floor(Math.random() * 5) + 1,
      volume: Math.floor(Math.random() * 100000) + 50000
    });
  }
  
  return series;
}

export default router;