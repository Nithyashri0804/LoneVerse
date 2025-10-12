import express from 'express';
import { generateDataset, saveDataset, exportToCSV } from '../services/datasetGenerator.js';

const router = express.Router();

/**
 * POST /api/dataset/generate
 * Generate a new dataset
 * 
 * Body:
 * - count: Number of wallets to generate (default: 1000, max: 10000)
 * - format: Output format - 'json' or 'csv' (default: 'json')
 * - save: Whether to save to file (default: false)
 */
router.post('/generate', async (req, res) => {
  try {
    const { count = 1000, format = 'json', save = false } = req.body;

    // Validate count
    const walletCount = Math.min(Math.max(parseInt(count) || 1000, 100), 10000);

    console.log(`Generating dataset with ${walletCount} wallets...`);

    // Generate dataset
    const datasetResult = await generateDataset(walletCount);

    // Save to file if requested
    let filepath = null;
    if (save) {
      if (format === 'csv') {
        filepath = await exportToCSV(datasetResult);
      } else {
        filepath = await saveDataset(datasetResult);
      }
    }

    // Return appropriate response
    if (format === 'csv') {
      // For CSV, convert to CSV string
      const headers = [
        'ID', 'WalletAddress', 'RiskProfile', 'CreditScore', 'NormalizedScore',
        'TxScore', 'PortfolioScore', 'LendingScore', 'DefiScore'
      ].join(',');
      
      const rows = datasetResult.dataset.map(d => [
        d.id,
        d.walletAddress,
        d.riskProfile,
        d.creditScore,
        d.normalizedScore,
        d.componentScores.transaction,
        d.componentScores.portfolio,
        d.componentScores.lending,
        d.componentScores.defi
      ].join(','));
      
      const csvContent = [headers, ...rows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=wallet_dataset.csv');
      return res.send(csvContent);
    }

    // Return JSON response
    res.json({
      success: true,
      statistics: datasetResult.statistics,
      filepath: filepath || 'not saved',
      sampleData: datasetResult.dataset.slice(0, 10), // Include first 10 entries as sample
      totalEntries: datasetResult.dataset.length
    });

  } catch (error) {
    console.error('Error generating dataset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate dataset',
      message: error.message
    });
  }
});

/**
 * GET /api/dataset/statistics
 * Get statistics about the dataset generator capabilities
 */
router.get('/statistics', (req, res) => {
  res.json({
    success: true,
    capabilities: {
      maxWallets: 10000,
      minWallets: 100,
      defaultWallets: 1000,
      supportedFormats: ['json', 'csv'],
      riskProfiles: ['low', 'medium', 'high'],
      creditScoreRange: { min: 300, max: 850 },
      features: [
        'Transaction Analysis',
        'Portfolio Stability',
        'Lending History',
        'DeFi Behavior'
      ]
    },
    algorithm: {
      weights: {
        transactionAnalysis: 0.30,
        portfolioStability: 0.25,
        lendingHistory: 0.25,
        defiBehavior: 0.20
      },
      scoreRange: '300-850',
      normalization: '0-1 scaled to 300-850'
    }
  });
});

/**
 * POST /api/dataset/validate
 * Validate a wallet's metrics against the scoring algorithm
 * 
 * Body:
 * - walletAddress: Wallet address
 * - transactionMetrics, portfolioMetrics, lendingHistory, defiBehavior
 */
router.post('/validate', async (req, res) => {
  try {
    const { walletAddress, transactionMetrics, portfolioMetrics, lendingHistory, defiBehavior } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    // Calculate credit score using provided metrics
    const { calculateCreditScore } = await import('../services/mlService.js');
    
    const result = await calculateCreditScore(
      walletAddress,
      transactionMetrics,
      portfolioMetrics,
      lendingHistory,
      defiBehavior
    );

    res.json({
      success: true,
      walletAddress,
      creditScore: result.creditScore,
      breakdown: result.breakdown,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error validating wallet metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate metrics',
      message: error.message
    });
  }
});

export default router;
