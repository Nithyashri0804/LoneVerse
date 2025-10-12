import express from 'express';
import { analyzeWallet } from '../services/walletAnalysisService.js';
import { calculateCreditScore } from '../services/mlService.js';

const router = express.Router();

/**
 * GET /api/credit-score/:address
 * Calculate credit score for a wallet address using on-chain analysis
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Validate Ethereum address
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }
    
    console.log(`📈 Calculating credit score for ${address}...`);
    
    // Analyze wallet on-chain data
    const walletAnalysis = await analyzeWallet(address);
    
    // Calculate credit score using weighted algorithm
    const creditScore = calculateCreditScore(walletAnalysis);
    
    // Determine credit category
    let category = 'Fair';
    if (creditScore >= 740) category = 'Excellent';
    else if (creditScore >= 670) category = 'Good';
    else if (creditScore >= 580) category = 'Fair';
    else category = 'Poor';
    
    // Calculate score breakdown for transparency
    const breakdown = {
      transactionAnalysis: {
        weight: '30%',
        score: Math.round((walletAnalysis.transactionMetrics.txCount > 100 ? 0.7 : 0.4) * 100)
      },
      portfolioStability: {
        weight: '25%',
        score: Math.round(walletAnalysis.portfolioStability.stablecoinRatio * 100)
      },
      lendingHistory: {
        weight: '25%',
        score: Math.round((walletAnalysis.lendingHistory.repaymentRate || 0.5) * 100)
      },
      defiBehavior: {
        weight: '20%',
        score: Math.round((walletAnalysis.defiBehavior.protocolCount > 5 ? 0.7 : 0.4) * 100)
      }
    };
    
    res.json({
      address,
      creditScore,
      category,
      breakdown,
      metrics: {
        transactionCount: walletAnalysis.transactionMetrics.txCount,
        totalVolume: walletAnalysis.transactionMetrics.totalVolume,
        stablecoinRatio: walletAnalysis.portfolioStability.stablecoinRatio,
        protocolCount: walletAnalysis.defiBehavior.protocolCount,
        defiExperience: walletAnalysis.defiBehavior.defiExperience
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Error calculating credit score:', error);
    res.status(500).json({ 
      error: 'Failed to calculate credit score',
      message: error.message 
    });
  }
});

/**
 * POST /api/credit-score/analyze
 * Detailed wallet analysis with full breakdown
 */
router.post('/analyze', async (req, res) => {
  try {
    const { address, includeLendingHistory } = req.body;
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }
    
    // Get lending history from contract if requested
    let lendingHistory = {};
    if (includeLendingHistory) {
      // This would query the smart contract for actual lending history
      // For now, use mock data
      lendingHistory = {
        totalLoans: 0,
        repaidLoans: 0,
        defaultedLoans: 0,
        avgRepaymentTime: 0,
        totalBorrowed: 0,
        totalRepaid: 0,
        repaymentRate: 0
      };
    }
    
    // Perform complete wallet analysis
    const walletAnalysis = await analyzeWallet(address, lendingHistory);
    
    // Calculate credit score
    const creditScore = calculateCreditScore(walletAnalysis);
    
    res.json({
      address,
      creditScore,
      analysis: walletAnalysis,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Error in detailed wallet analysis:', error);
    res.status(500).json({ 
      error: 'Failed to analyze wallet',
      message: error.message 
    });
  }
});

/**
 * GET /api/credit-score/batch
 * Batch credit score calculation for multiple addresses
 */
router.post('/batch', async (req, res) => {
  try {
    const { addresses } = req.body;
    
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ error: 'Addresses array is required' });
    }
    
    if (addresses.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 addresses per batch' });
    }
    
    // Validate all addresses
    const invalidAddresses = addresses.filter(addr => !/^0x[a-fA-F0-9]{40}$/.test(addr));
    if (invalidAddresses.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid addresses found',
        invalidAddresses 
      });
    }
    
    // Process all addresses in parallel
    const results = await Promise.all(
      addresses.map(async (address) => {
        try {
          const walletAnalysis = await analyzeWallet(address);
          const creditScore = calculateCreditScore(walletAnalysis);
          
          return {
            address,
            creditScore,
            success: true
          };
        } catch (error) {
          return {
            address,
            error: error.message,
            success: false
          };
        }
      })
    );
    
    res.json({
      results,
      total: addresses.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Error in batch credit score calculation:', error);
    res.status(500).json({ 
      error: 'Failed to process batch request',
      message: error.message 
    });
  }
});

export default router;
