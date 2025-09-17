import express from 'express';
import { calculateRiskScore, getRiskCategory, getRecommendedInterestRate } from '../services/mlService.js';
import { getBorrowerHistory, getLoanDetails } from '../services/contractService.js';

const router = express.Router();

/**
 * Calculate risk score for a borrower and loan request
 */
router.post('/calculate', async (req, res) => {
  try {
    const { borrowerAddress, loanData } = req.body;

    if (!borrowerAddress || !loanData) {
      return res.status(400).json({ error: 'Missing borrower address or loan data' });
    }

    // Get borrower's historical data
    const borrowerHistory = await getBorrowerHistory(borrowerAddress);
    
    // Calculate risk score using ML model
    const riskScore = calculateRiskScore(borrowerHistory, loanData);
    const riskCategory = getRiskCategory(riskScore);
    const recommendedRate = getRecommendedInterestRate(riskScore);

    // Calculate additional metrics
    const metrics = calculateAdditionalMetrics(borrowerHistory, loanData, riskScore);

    res.json({
      riskScore,
      riskCategory,
      recommendedInterestRate: recommendedRate,
      confidence: metrics.confidence,
      factors: metrics.factors,
      recommendations: metrics.recommendations
    });

  } catch (error) {
    console.error('Risk calculation error:', error);
    res.status(500).json({ 
      error: 'Failed to calculate risk score',
      details: error.message
    });
  }
});

/**
 * Get detailed risk analysis for a specific loan
 */
router.get('/analysis/:loanId', async (req, res) => {
  try {
    const { loanId } = req.params;
    
    // Get loan details from contract
    const loanDetails = await getLoanDetails(loanId);
    if (!loanDetails) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Get borrower history
    const borrowerHistory = await getBorrowerHistory(loanDetails.borrower);
    
    // Calculate comprehensive risk analysis
    const riskScore = calculateRiskScore(borrowerHistory, loanDetails);
    const analysis = generateRiskAnalysis(borrowerHistory, loanDetails, riskScore);

    res.json({
      loanId,
      borrower: loanDetails.borrower,
      riskScore,
      analysis
    });

  } catch (error) {
    console.error('Risk analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to generate risk analysis',
      details: error.message
    });
  }
});

/**
 * Get risk trends for the platform
 */
router.get('/trends', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // This would typically query a database for historical risk data
    // For now, return mock trending data
    const trends = generateRiskTrends(period);

    res.json(trends);

  } catch (error) {
    console.error('Risk trends error:', error);
    res.status(500).json({ 
      error: 'Failed to get risk trends',
      details: error.message
    });
  }
});

/**
 * Calculate additional risk metrics
 */
function calculateAdditionalMetrics(borrowerHistory, loanData, riskScore) {
  const totalLoans = borrowerHistory.totalLoansCount || 0;
  const repaymentRate = totalLoans > 0 ? (borrowerHistory.repaidLoansCount || 0) / totalLoans : 0;
  
  // Calculate confidence based on data availability
  let confidence = 0.5; // Base confidence
  if (totalLoans > 0) confidence += 0.2;
  if (totalLoans > 5) confidence += 0.2;
  if (repaymentRate > 0.8) confidence += 0.1;
  confidence = Math.min(confidence, 1.0);

  // Identify key risk factors
  const factors = [];
  if (repaymentRate < 0.8 && totalLoans > 0) {
    factors.push({
      factor: 'Low Repayment Rate',
      impact: 'negative',
      description: `${(repaymentRate * 100).toFixed(1)}% repayment rate indicates higher risk`
    });
  }
  
  if (borrowerHistory.creditScore < 400) {
    factors.push({
      factor: 'Low Credit Score',
      impact: 'negative',
      description: 'Credit score below recommended threshold'
    });
  }
  
  if (loanData.collateralRatio < 1.5) {
    factors.push({
      factor: 'Low Collateral Ratio',
      impact: 'negative',
      description: 'Collateral ratio below 150% increases risk'
    });
  }
  
  if (totalLoans === 0) {
    factors.push({
      factor: 'New Borrower',
      impact: 'neutral',
      description: 'No lending history available for assessment'
    });
  }

  // Generate recommendations
  const recommendations = [];
  if (riskScore > 700) {
    recommendations.push('Consider requiring additional collateral');
    recommendations.push('Implement shorter loan duration');
  }
  if (riskScore > 800) {
    recommendations.push('High risk - proceed with caution');
  }
  if (totalLoans === 0) {
    recommendations.push('Consider smaller initial loan amount for new borrowers');
  }

  return {
    confidence,
    factors,
    recommendations
  };
}

/**
 * Generate comprehensive risk analysis
 */
function generateRiskAnalysis(borrowerHistory, loanDetails, riskScore) {
  const analysis = {
    overall: {
      score: riskScore,
      category: getRiskCategory(riskScore),
      summary: generateRiskSummary(riskScore, borrowerHistory)
    },
    borrowerProfile: {
      experience: borrowerHistory.totalLoansCount || 0,
      repaymentHistory: {
        totalLoans: borrowerHistory.totalLoansCount || 0,
        repaid: borrowerHistory.repaidLoansCount || 0,
        defaulted: borrowerHistory.defaultedLoansCount || 0,
        rate: borrowerHistory.totalLoansCount > 0 ? 
               (borrowerHistory.repaidLoansCount || 0) / borrowerHistory.totalLoansCount : 0
      },
      creditScore: borrowerHistory.creditScore || 500
    },
    loanCharacteristics: {
      amount: loanDetails.amount,
      duration: loanDetails.duration,
      collateralRatio: loanData.collateralAmount / loanData.amount,
      interestRate: loanDetails.interestRate
    },
    riskFactors: calculateAdditionalMetrics(borrowerHistory, loanDetails, riskScore).factors
  };

  return analysis;
}

/**
 * Generate risk summary text
 */
function generateRiskSummary(riskScore, borrowerHistory) {
  const category = getRiskCategory(riskScore);
  const totalLoans = borrowerHistory.totalLoansCount || 0;
  
  if (category === 'Low') {
    return `Low risk borrower with ${totalLoans > 0 ? 'strong' : 'no'} repayment history.`;
  } else if (category === 'Medium') {
    return `Medium risk profile. ${totalLoans > 0 ? 'Review historical performance.' : 'New borrower requiring assessment.'}`;
  } else if (category === 'High') {
    return `High risk borrower. Consider additional safeguards and monitoring.`;
  } else {
    return `Very high risk. Recommend rejecting or requiring significant additional collateral.`;
  }
}

/**
 * Generate mock risk trends data
 */
function generateRiskTrends(period) {
  const dataPoints = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const trends = [];
  
  for (let i = dataPoints; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    trends.push({
      date: date.toISOString().split('T')[0],
      averageRiskScore: 400 + Math.random() * 200,
      totalLoans: Math.floor(10 + Math.random() * 50),
      highRiskLoans: Math.floor(Math.random() * 10),
      defaultRate: 0.02 + Math.random() * 0.05
    });
  }
  
  return {
    period,
    trends,
    summary: {
      averageRiskScore: trends.reduce((sum, t) => sum + t.averageRiskScore, 0) / trends.length,
      totalLoans: trends.reduce((sum, t) => sum + t.totalLoans, 0),
      averageDefaultRate: trends.reduce((sum, t) => sum + t.defaultRate, 0) / trends.length
    }
  };
}

export default router;