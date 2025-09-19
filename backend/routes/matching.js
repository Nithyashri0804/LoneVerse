import express from 'express';
import interestRateService from '../services/interestRateService.js';

const router = express.Router();

/**
 * Get market statistics and rates
 */
router.get('/market-stats', (req, res) => {
  try {
    const stats = interestRateService.getMarketStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting market stats:', error);
    res.status(500).json({ 
      error: 'Failed to get market stats',
      message: error.message 
    });
  }
});

/**
 * Get borrower recommendations
 */
router.post('/borrower-recommendations', (req, res) => {
  try {
    const { tokenType, amount, maxRate, duration, riskScore } = req.body;
    
    if (!tokenType || !amount || !maxRate || !duration || riskScore === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['tokenType', 'amount', 'maxRate', 'duration', 'riskScore']
      });
    }

    const recommendations = interestRateService.getBorrowerRecommendations(
      tokenType, 
      amount, 
      maxRate, 
      duration, 
      riskScore
    );
    
    res.json(recommendations);
  } catch (error) {
    console.error('Error getting borrower recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to get recommendations',
      message: error.message 
    });
  }
});

/**
 * Add a new loan request to the matching pool
 */
router.post('/loan-request', (req, res) => {
  try {
    const { 
      loanId, 
      borrower, 
      tokenType, 
      amount, 
      maxInterestRate, 
      duration, 
      riskScore 
    } = req.body;
    
    if (!loanId || !borrower || !tokenType || !amount || !maxInterestRate || !duration || riskScore === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['loanId', 'borrower', 'tokenType', 'amount', 'maxInterestRate', 'duration', 'riskScore']
      });
    }

    interestRateService.addLoanRequest(
      loanId, 
      borrower, 
      tokenType, 
      amount, 
      maxInterestRate, 
      duration, 
      riskScore
    );
    
    res.json({ 
      success: true, 
      message: 'Loan request added to matching pool',
      loanId 
    });
  } catch (error) {
    console.error('Error adding loan request:', error);
    res.status(500).json({ 
      error: 'Failed to add loan request',
      message: error.message 
    });
  }
});

/**
 * Add a new lending offer to the matching pool
 */
router.post('/lending-offer', (req, res) => {
  try {
    const { 
      offerId, 
      lender, 
      tokenType, 
      amount, 
      minInterestRate, 
      maxInterestRate, 
      minDuration, 
      maxDuration 
    } = req.body;
    
    if (!offerId || !lender || !tokenType || !amount || 
        minInterestRate === undefined || maxInterestRate === undefined || 
        !minDuration || !maxDuration) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['offerId', 'lender', 'tokenType', 'amount', 'minInterestRate', 'maxInterestRate', 'minDuration', 'maxDuration']
      });
    }

    interestRateService.addLendingOffer(
      offerId, 
      lender, 
      tokenType, 
      amount, 
      minInterestRate, 
      maxInterestRate, 
      minDuration, 
      maxDuration
    );
    
    res.json({ 
      success: true, 
      message: 'Lending offer added to matching pool',
      offerId 
    });
  } catch (error) {
    console.error('Error adding lending offer:', error);
    res.status(500).json({ 
      error: 'Failed to add lending offer',
      message: error.message 
    });
  }
});

/**
 * Get optimal interest rate calculation
 */
router.post('/calculate-rate', (req, res) => {
  try {
    const { tokenType, amount, duration, riskScore } = req.body;
    
    if (!tokenType || !amount || !duration || riskScore === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['tokenType', 'amount', 'duration', 'riskScore']
      });
    }

    const optimalRate = interestRateService.calculateOptimalRate(
      tokenType, 
      amount, 
      duration, 
      riskScore
    );
    
    const marketStats = interestRateService.getMarketStats();
    const marketRate = marketStats.averageRates[tokenType] || optimalRate;
    
    res.json({ 
      optimalRate,
      marketRate,
      rateDifference: optimalRate - marketRate,
      rateBreakdown: {
        baseRate: 300, // 3%
        riskPremium: Math.round((riskScore / 1000) * 1500),
        durationPremium: Math.round(Math.min(duration / (365 * 24 * 3600) * 200, 400)),
        marketPremium: 'calculated based on supply/demand'
      }
    });
  } catch (error) {
    console.error('Error calculating optimal rate:', error);
    res.status(500).json({ 
      error: 'Failed to calculate rate',
      message: error.message 
    });
  }
});

/**
 * Trigger manual matching process
 */
router.post('/trigger-matching', (req, res) => {
  try {
    interestRateService.processMatching();
    res.json({ 
      success: true, 
      message: 'Manual matching process triggered' 
    });
  } catch (error) {
    console.error('Error triggering matching:', error);
    res.status(500).json({ 
      error: 'Failed to trigger matching',
      message: error.message 
    });
  }
});

/**
 * Get active loan requests and lending offers
 */
router.get('/active-pools', (req, res) => {
  try {
    const stats = {
      loanRequests: Array.from(interestRateService.loanRequests.values()),
      lendingOffers: Array.from(interestRateService.lendingOffers.values()),
      recentMatches: interestRateService.matchedDeals.slice(-10) // Last 10 matches
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting active pools:', error);
    res.status(500).json({ 
      error: 'Failed to get active pools',
      message: error.message 
    });
  }
});

export default router;