/**
 * Performance Metrics and Statistical Validation Service
 * Validates credit scoring system against benchmarks and industry standards
 */

/**
 * Calculate accuracy metrics for credit score predictions
 * @param {Array} predictions - Array of {actual, predicted} objects
 * @returns {object} Accuracy metrics
 */
export function calculateAccuracyMetrics(predictions) {
  if (!predictions || predictions.length === 0) {
    return { error: 'No predictions provided' };
  }

  // Validate input data - must be finite numbers
  const validPredictions = predictions.filter(p => 
    p && 
    Number.isFinite(p.actual) && 
    Number.isFinite(p.predicted)
  );

  if (validPredictions.length === 0) {
    return { error: 'No valid predictions with finite actual and predicted values' };
  }

  // Mean Absolute Error (MAE)
  const mae = validPredictions.reduce((sum, p) => 
    sum + Math.abs(p.actual - p.predicted), 0) / validPredictions.length;

  // Root Mean Squared Error (RMSE)
  const mse = validPredictions.reduce((sum, p) => 
    sum + Math.pow(p.actual - p.predicted, 2), 0) / validPredictions.length;
  const rmse = Math.sqrt(mse);

  // Mean Absolute Percentage Error (MAPE) - exclude zero actual values
  const nonZeroPredictions = validPredictions.filter(p => p.actual !== 0);
  let mape = 0;
  
  if (nonZeroPredictions.length > 0) {
    mape = nonZeroPredictions.reduce((sum, p) => 
      sum + Math.abs((p.actual - p.predicted) / p.actual), 0) / nonZeroPredictions.length * 100;
  }

  // R-squared (coefficient of determination)
  const actualMean = validPredictions.reduce((sum, p) => sum + p.actual, 0) / validPredictions.length;
  const ssTotal = validPredictions.reduce((sum, p) => sum + Math.pow(p.actual - actualMean, 2), 0);
  const ssResidual = validPredictions.reduce((sum, p) => sum + Math.pow(p.actual - p.predicted, 2), 0);
  
  // Handle zero variance case
  const rSquared = ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);

  return {
    mae: parseFloat(mae.toFixed(2)),
    rmse: parseFloat(rmse.toFixed(2)),
    mape: nonZeroPredictions.length > 0 ? parseFloat(mape.toFixed(2)) : null,
    mapeNote: nonZeroPredictions.length === 0 ? 'MAPE unavailable (all actual values are zero)' : null,
    rSquared: parseFloat(rSquared.toFixed(4)),
    sampleSize: validPredictions.length,
    mapeValidSamples: nonZeroPredictions.length,
    invalidSamples: predictions.length - validPredictions.length
  };
}

/**
 * Calculate classification metrics for risk categories
 * @param {Array} data - Array of {actual, predicted, category} objects
 * @returns {object} Classification metrics
 */
export function calculateClassificationMetrics(data) {
  if (!data || data.length === 0) {
    return { error: 'No data provided' };
  }

  // Validate input and extract unique categories from data
  const validData = data.filter(d => d && d.actual && d.predicted);
  
  if (validData.length === 0) {
    return { error: 'No valid data with actual and predicted values' };
  }

  // Extract unique categories from the actual data
  const categories = [...new Set([
    ...validData.map(d => d.actual),
    ...validData.map(d => d.predicted)
  ])].sort();

  // Calculate confusion matrix
  const confusionMatrix = {};
  
  categories.forEach(actual => {
    confusionMatrix[actual] = {};
    categories.forEach(predicted => {
      confusionMatrix[actual][predicted] = 0;
    });
  });

  validData.forEach(item => {
    if (confusionMatrix[item.actual] && confusionMatrix[item.actual][item.predicted] !== undefined) {
      confusionMatrix[item.actual][item.predicted]++;
    }
  });

  // Calculate precision, recall, F1-score for each category
  const metrics = {};
  
  categories.forEach(category => {
    const tp = confusionMatrix[category][category] || 0;
    const fp = categories.reduce((sum, c) => 
      c !== category ? sum + (confusionMatrix[c][category] || 0) : sum, 0);
    const fn = categories.reduce((sum, c) => 
      c !== category ? sum + (confusionMatrix[category][c] || 0) : sum, 0);
    
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    metrics[category] = {
      precision: parseFloat(precision.toFixed(4)),
      recall: parseFloat(recall.toFixed(4)),
      f1Score: parseFloat(f1Score.toFixed(4)),
      support: tp + fn
    };
  });

  // Overall accuracy
  const correct = categories.reduce((sum, c) => sum + (confusionMatrix[c][c] || 0), 0);
  const total = validData.length;
  const accuracy = total > 0 ? correct / total : 0;

  return {
    confusionMatrix,
    metrics,
    categories,
    overallAccuracy: parseFloat(accuracy.toFixed(4)),
    sampleSize: total,
    invalidSamples: data.length - validData.length
  };
}

/**
 * Compare with traditional FICO benchmarks
 * @param {number} creditScore - LoanVerse credit score
 * @returns {object} Benchmark comparison
 */
export function compareToBenchmark(creditScore) {
  // FICO score ranges and corresponding risk levels
  const ficoRanges = {
    'Exceptional (800-850)': { min: 800, max: 850, risk: 'very_low' },
    'Very Good (740-799)': { min: 740, max: 799, risk: 'low' },
    'Good (670-739)': { min: 670, max: 739, risk: 'medium_low' },
    'Fair (580-669)': { min: 580, max: 669, risk: 'medium' },
    'Poor (300-579)': { min: 300, max: 579, risk: 'high' }
  };

  let category = 'Unknown';
  let risk = 'unknown';

  for (const [range, values] of Object.entries(ficoRanges)) {
    if (creditScore >= values.min && creditScore <= values.max) {
      category = range;
      risk = values.risk;
      break;
    }
  }

  return {
    loanVerseScore: creditScore,
    ficoCategory: category,
    riskLevel: risk,
    interpretation: getInterpretation(creditScore)
  };
}

/**
 * Get interpretation for credit score
 */
function getInterpretation(score) {
  if (score >= 750) {
    return 'Excellent creditworthiness. Qualifies for best interest rates and loan terms.';
  } else if (score >= 650) {
    return 'Good creditworthiness. Qualifies for favorable interest rates.';
  } else if (score >= 550) {
    return 'Fair creditworthiness. May qualify with moderate interest rates.';
  } else if (score >= 450) {
    return 'Poor creditworthiness. Limited loan options with higher interest rates.';
  } else {
    return 'Very poor creditworthiness. High risk, may require significant collateral.';
  }
}

/**
 * Calculate system performance statistics
 * @param {Array} dataset - Full dataset with predictions
 * @returns {object} Performance statistics
 */
export function calculateSystemPerformance(dataset) {
  if (!dataset || dataset.length === 0) {
    return { error: 'No dataset provided' };
  }

  // Calculate score distribution
  const scoreRanges = {
    'Excellent (750-850)': dataset.filter(d => d.creditScore >= 750).length,
    'Good (650-749)': dataset.filter(d => d.creditScore >= 650 && d.creditScore < 750).length,
    'Fair (550-649)': dataset.filter(d => d.creditScore >= 550 && d.creditScore < 650).length,
    'Poor (450-549)': dataset.filter(d => d.creditScore >= 450 && d.creditScore < 550).length,
    'Very Poor (300-449)': dataset.filter(d => d.creditScore < 450).length
  };

  // Calculate component score contributions
  const componentAnalysis = {
    transaction: {
      min: Math.min(...dataset.map(d => d.componentScores.transaction)),
      max: Math.max(...dataset.map(d => d.componentScores.transaction)),
      avg: dataset.reduce((sum, d) => sum + d.componentScores.transaction, 0) / dataset.length,
      weight: 0.30
    },
    portfolio: {
      min: Math.min(...dataset.map(d => d.componentScores.portfolio)),
      max: Math.max(...dataset.map(d => d.componentScores.portfolio)),
      avg: dataset.reduce((sum, d) => sum + d.componentScores.portfolio, 0) / dataset.length,
      weight: 0.25
    },
    lending: {
      min: Math.min(...dataset.map(d => d.componentScores.lending)),
      max: Math.max(...dataset.map(d => d.componentScores.lending)),
      avg: dataset.reduce((sum, d) => sum + d.componentScores.lending, 0) / dataset.length,
      weight: 0.25
    },
    defi: {
      min: Math.min(...dataset.map(d => d.componentScores.defi)),
      max: Math.max(...dataset.map(d => d.componentScores.defi)),
      avg: dataset.reduce((sum, d) => sum + d.componentScores.defi, 0) / dataset.length,
      weight: 0.20
    }
  };

  // Calculate credit score statistics
  const creditScores = dataset.map(d => d.creditScore);
  const avgScore = creditScores.reduce((sum, score) => sum + score, 0) / creditScores.length;
  const variance = creditScores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / creditScores.length;
  const stdDev = Math.sqrt(variance);

  return {
    totalWallets: dataset.length,
    scoreDistribution: scoreRanges,
    creditScoreStats: {
      min: Math.min(...creditScores),
      max: Math.max(...creditScores),
      mean: parseFloat(avgScore.toFixed(2)),
      median: calculateMedian(creditScores),
      stdDev: parseFloat(stdDev.toFixed(2))
    },
    componentAnalysis,
    algorithmWeights: {
      transactionAnalysis: '30%',
      portfolioStability: '25%',
      lendingHistory: '25%',
      defiBehavior: '20%'
    }
  };
}

/**
 * Calculate median value
 */
function calculateMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Validate scoring algorithm consistency
 * @param {Array} dataset - Dataset to validate
 * @returns {object} Validation results
 */
export function validateAlgorithmConsistency(dataset) {
  if (!dataset || dataset.length === 0) {
    return { error: 'No dataset provided' };
  }

  const issues = [];
  let validCount = 0;

  dataset.forEach(wallet => {
    // Validate score range
    if (wallet.creditScore < 300 || wallet.creditScore > 850) {
      issues.push({
        walletId: wallet.id,
        issue: `Credit score ${wallet.creditScore} out of range (300-850)`
      });
    } else {
      validCount++;
    }

    // Validate normalized score
    if (wallet.normalizedScore < 0 || wallet.normalizedScore > 1) {
      issues.push({
        walletId: wallet.id,
        issue: `Normalized score ${wallet.normalizedScore} out of range (0-1)`
      });
    }

    // Validate component scores
    Object.entries(wallet.componentScores).forEach(([component, score]) => {
      if (score < 0 || score > 1) {
        issues.push({
          walletId: wallet.id,
          issue: `${component} component score ${score} out of range (0-1)`
        });
      }
    });
  });

  return {
    totalWallets: dataset.length,
    validWallets: validCount,
    invalidWallets: issues.length,
    validationRate: parseFloat((validCount / dataset.length * 100).toFixed(2)),
    issues: issues.slice(0, 10) // Show first 10 issues
  };
}

export default {
  calculateAccuracyMetrics,
  calculateClassificationMetrics,
  compareToBenchmark,
  calculateSystemPerformance,
  validateAlgorithmConsistency
};
