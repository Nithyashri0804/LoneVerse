import express from 'express';
import {
  calculateAccuracyMetrics,
  calculateClassificationMetrics,
  compareToBenchmark,
  calculateSystemPerformance,
  validateAlgorithmConsistency
} from '../services/performanceMetrics.js';
import { generateDataset } from '../services/datasetGenerator.js';

const router = express.Router();

/**
 * GET /api/performance/benchmark/:score
 * Compare a credit score with traditional FICO benchmarks
 */
router.get('/benchmark/:score', (req, res) => {
  try {
    const score = parseInt(req.params.score);

    if (isNaN(score) || score < 300 || score > 850) {
      return res.status(400).json({
        success: false,
        error: 'Invalid credit score. Must be between 300 and 850.'
      });
    }

    const benchmark = compareToBenchmark(score);

    res.json({
      success: true,
      ...benchmark
    });

  } catch (error) {
    console.error('Error comparing to benchmark:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare with benchmark'
    });
  }
});

/**
 * POST /api/performance/accuracy
 * Calculate accuracy metrics for predictions
 * 
 * Body:
 * - predictions: Array of {actual, predicted} objects
 */
router.post('/accuracy', (req, res) => {
  try {
    const { predictions } = req.body;

    if (!predictions || !Array.isArray(predictions)) {
      return res.status(400).json({
        success: false,
        error: 'predictions array is required'
      });
    }

    const metrics = calculateAccuracyMetrics(predictions);

    if (metrics.error) {
      return res.status(400).json({
        success: false,
        error: metrics.error
      });
    }

    res.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('Error calculating accuracy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate accuracy metrics'
    });
  }
});

/**
 * POST /api/performance/classification
 * Calculate classification metrics for risk categories
 * 
 * Body:
 * - data: Array of {actual, predicted, category} objects
 */
router.post('/classification', (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'data array is required'
      });
    }

    const metrics = calculateClassificationMetrics(data);

    if (metrics.error) {
      return res.status(400).json({
        success: false,
        error: metrics.error
      });
    }

    res.json({
      success: true,
      ...metrics
    });

  } catch (error) {
    console.error('Error calculating classification metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate classification metrics'
    });
  }
});

/**
 * POST /api/performance/system-stats
 * Get overall system performance statistics
 * Can accept dataset or generate one for testing
 * 
 * Body (optional):
 * - dataset: Array of wallet data to analyze
 * - generateCount: Number of wallets to generate if no dataset provided
 */
router.post('/system-stats', async (req, res) => {
  try {
    let dataset;
    let generated = false;
    
    if (req.body.dataset && Array.isArray(req.body.dataset)) {
      // Use provided dataset
      dataset = req.body.dataset;
    } else {
      // Generate sample dataset for testing
      const count = parseInt(req.body.generateCount || req.query.count) || 1000;
      console.log(`Generating dataset with ${count} wallets for performance analysis...`);
      const result = await generateDataset(Math.min(count, 5000));
      dataset = result.dataset;
      generated = true;
    }
    
    // Calculate system performance
    const performance = calculateSystemPerformance(dataset);
    
    // Validate algorithm consistency
    const validation = validateAlgorithmConsistency(dataset);

    res.json({
      success: true,
      systemPerformance: performance,
      algorithmValidation: validation,
      datasetSize: dataset.length,
      datasetGenerated: generated
    });

  } catch (error) {
    console.error('Error calculating system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate system statistics'
    });
  }
});

/**
 * POST /api/performance/validate
 * Validate a dataset for algorithm consistency
 * 
 * Body:
 * - dataset: Array of wallet data
 */
router.post('/validate', (req, res) => {
  try {
    const { dataset } = req.body;

    if (!dataset || !Array.isArray(dataset)) {
      return res.status(400).json({
        success: false,
        error: 'dataset array is required'
      });
    }

    const validation = validateAlgorithmConsistency(dataset);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    res.json({
      success: true,
      validation
    });

  } catch (error) {
    console.error('Error validating dataset:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate dataset'
    });
  }
});

/**
 * POST /api/performance/report
 * Generate comprehensive performance report
 * Can accept dataset or generate one for testing
 * 
 * Body (optional):
 * - dataset: Array of wallet data to analyze
 * - generateCount: Number of wallets to generate if no dataset provided
 */
router.post('/report', async (req, res) => {
  try {
    let dataset, statistics;
    let generated = false;
    
    if (req.body.dataset && Array.isArray(req.body.dataset)) {
      // Use provided dataset
      dataset = req.body.dataset;
      // Calculate statistics from provided dataset
      statistics = {
        totalWallets: dataset.length,
        creditScoreDistribution: {
          excellent: dataset.filter(d => d.creditScore >= 750).length,
          good: dataset.filter(d => d.creditScore >= 650 && d.creditScore < 750).length,
          fair: dataset.filter(d => d.creditScore >= 550 && d.creditScore < 650).length,
          poor: dataset.filter(d => d.creditScore >= 450 && d.creditScore < 550).length,
          veryPoor: dataset.filter(d => d.creditScore < 450).length
        },
        averageCreditScore: Math.round(dataset.reduce((sum, d) => sum + d.creditScore, 0) / dataset.length)
      };
    } else {
      // Generate sample dataset for testing
      const count = parseInt(req.body.generateCount || req.query.count) || 1000;
      const result = await generateDataset(Math.min(count, 5000));
      dataset = result.dataset;
      statistics = result.statistics;
      generated = true;
    }
    
    // System performance
    const systemPerf = calculateSystemPerformance(dataset);
    
    // Algorithm validation
    const validation = validateAlgorithmConsistency(dataset);
    
    // Sample benchmark comparisons
    const benchmarks = [
      compareToBenchmark(800),
      compareToBenchmark(700),
      compareToBenchmark(600),
      compareToBenchmark(500),
      compareToBenchmark(400)
    ];

    res.json({
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        datasetSize: dataset.length,
        datasetGenerated: generated,
        datasetStatistics: statistics,
        systemPerformance: systemPerf,
        algorithmValidation: validation,
        benchmarkExamples: benchmarks,
        summary: {
          validationRate: validation.validationRate,
          averageScore: systemPerf.creditScoreStats.mean,
          scoreStdDev: systemPerf.creditScoreStats.stdDev,
          algorithmWeights: systemPerf.algorithmWeights
        }
      }
    });

  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report'
    });
  }
});

export default router;
