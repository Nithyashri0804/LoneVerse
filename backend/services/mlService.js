// Optional TensorFlow import - gracefully handle if not available
let tf = null;
let model = null;
let mlAvailable = false;

// Try to import TensorFlow - fallback to heuristic-only mode if unavailable
try {
  if (process.env.ENABLE_ML_FEATURES !== 'false') {
    tf = await import('@tensorflow/tfjs-node').catch(() => {
      console.log('📝 TensorFlow.js-node not available, trying browser version...');
      return import('@tensorflow/tfjs');
    });
    mlAvailable = true;
    console.log('✅ TensorFlow.js loaded successfully');
  } else {
    console.log('📝 ML features disabled via environment variable');
  }
} catch (error) {
  console.log('📝 TensorFlow.js not available, using heuristic-only risk assessment');
  mlAvailable = false;
}

/**
 * Initialize the ML model for credit risk assessment
 */
export async function initializeMLModel() {
  try {
    if (!mlAvailable || !tf) {
      console.log('⚡ Using heuristic-based risk assessment (ML disabled)');
      return { mlEnabled: false, fallbackMode: 'heuristic' };
    }

    // For now, create a simple neural network
    // In production, this would load a pre-trained model
    model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [8], // Input features
          units: 64,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid' // Output between 0 and 1
        })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('🤖 ML model created successfully');
    return { mlEnabled: true, fallbackMode: null };
    
  } catch (error) {
    console.error('⚠️ Error initializing ML model, falling back to heuristic mode:', error.message);
    mlAvailable = false;
    return { mlEnabled: false, fallbackMode: 'heuristic', error: error.message };
  }
}

/**
 * Calculate risk score based on borrower profile and loan details
 * @param {Object} borrowerData - Borrower's historical data
 * @param {Object} loanData - Current loan request data
 * @returns {number} Risk score between 0-1000 (for internal use, convert to 300-850 for display)
 */
export function calculateRiskScore(borrowerData, loanData) {
  try {
    // Extract features for risk assessment
    const features = extractFeatures(borrowerData, loanData);
    
    // For demo purposes, use a heuristic-based approach
    // In production, this would use the trained ML model
    const riskScore = calculateHeuristicRiskScore(features);
    
    // Convert to 0-1000 scale
    return Math.round(riskScore * 1000);
    
  } catch (error) {
    console.error('Error calculating risk score:', error);
    return 500; // Default medium risk
  }
}

/**
 * Calculate credit score based on weighted algorithm as per paper requirements
 * Transaction Analysis (30%), Portfolio Stability (25%), Lending History (25%), DeFi Behavior (20%)
 * @param {Object} walletData - Complete wallet analysis data
 * @returns {number} Credit score between 300-850
 */
export function calculateCreditScore(walletData) {
  try {
    const {
      transactionMetrics = {},
      portfolioStability = {},
      lendingHistory = {},
      defiBehavior = {}
    } = walletData;

    // Transaction Analysis (30% weight)
    const txScore = calculateTransactionScore(transactionMetrics) * 0.30;
    
    // Portfolio Stability (25% weight)
    const portfolioScore = calculatePortfolioScore(portfolioStability) * 0.25;
    
    // Lending History (25% weight)
    const historyScore = calculateHistoryScore(lendingHistory) * 0.25;
    
    // DeFi Behavior (20% weight)
    const defiScore = calculateDeFiScore(defiBehavior) * 0.20;
    
    // Combine weighted scores (0-1 scale)
    const normalizedScore = txScore + portfolioScore + historyScore + defiScore;
    
    // Convert from 0-1 scale to 300-850 range
    const creditScore = 300 + (normalizedScore * 550);
    
    return Math.round(Math.max(300, Math.min(850, creditScore)));
    
  } catch (error) {
    console.error('Error calculating credit score:', error);
    return 575; // Default medium credit score (middle of 300-850 range)
  }
}

/**
 * Calculate transaction analysis score (0-1)
 * Analyzes: tx count, volume, frequency, time between transactions
 */
function calculateTransactionScore(metrics) {
  const {
    txCount = 0,
    totalVolume = 0,
    avgFrequency = 0, // transactions per day
    avgTimeBetween = 0 // hours
  } = metrics;
  
  let score = 0.5;
  
  // Transaction count impact
  if (txCount > 1000) score += 0.15;
  else if (txCount > 500) score += 0.10;
  else if (txCount > 100) score += 0.05;
  else if (txCount < 10) score -= 0.15;
  
  // Volume impact (normalized)
  const volumeImpact = Math.min(totalVolume / 1000000, 1) * 0.15;
  score += volumeImpact;
  
  // Frequency impact (consistent activity is good)
  if (avgFrequency > 5) score += 0.10; // Very active
  else if (avgFrequency > 1) score += 0.05; // Active
  else if (avgFrequency < 0.1) score -= 0.10; // Inactive
  
  // Time between transactions (consistent is good)
  if (avgTimeBetween < 24 && avgTimeBetween > 0) score += 0.10; // Daily activity
  else if (avgTimeBetween < 168) score += 0.05; // Weekly activity
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate portfolio stability score (0-1)
 * Analyzes: stablecoin ratio, holding period diversity, volatility metrics
 */
function calculatePortfolioScore(metrics) {
  const {
    stablecoinRatio = 0,
    avgHoldingPeriod = 0, // days
    volatilityIndex = 0.5, // 0-1 scale
    diversityScore = 0 // 0-1 scale
  } = metrics;
  
  let score = 0.5;
  
  // Stablecoin ratio (higher is more stable)
  if (stablecoinRatio > 0.7) score += 0.20;
  else if (stablecoinRatio > 0.5) score += 0.15;
  else if (stablecoinRatio > 0.3) score += 0.10;
  else if (stablecoinRatio < 0.1) score -= 0.10;
  
  // Holding period (longer is more stable)
  if (avgHoldingPeriod > 180) score += 0.15; // 6+ months
  else if (avgHoldingPeriod > 90) score += 0.10; // 3+ months
  else if (avgHoldingPeriod > 30) score += 0.05; // 1+ month
  else if (avgHoldingPeriod < 7) score -= 0.10; // Less than a week
  
  // Volatility (lower is better)
  score -= (volatilityIndex - 0.5) * 0.15;
  
  // Diversity (moderate is good)
  score += diversityScore * 0.10;
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate lending history score (0-1)
 * Analyzes: previous loan repayments
 */
function calculateHistoryScore(history) {
  const {
    totalLoans = 0,
    repaidLoans = 0,
    defaultedLoans = 0,
    avgRepaymentTime = 0, // percentage of duration used
    totalBorrowed = 0,
    totalRepaid = 0
  } = history;
  
  let score = 0.5;
  
  if (totalLoans === 0) {
    return 0.5; // Neutral for new borrowers
  }
  
  const repaymentRate = repaidLoans / totalLoans;
  const defaultRate = defaultedLoans / totalLoans;
  
  // Repayment rate (most important)
  if (repaymentRate > 0.95) score += 0.30;
  else if (repaymentRate > 0.85) score += 0.20;
  else if (repaymentRate > 0.75) score += 0.10;
  else if (repaymentRate < 0.5) score -= 0.30;
  
  // Default rate (penalty)
  if (defaultRate > 0.2) score -= 0.25;
  else if (defaultRate > 0.1) score -= 0.15;
  else if (defaultRate > 0.05) score -= 0.10;
  
  // Early repayment bonus
  if (avgRepaymentTime < 0.8 && avgRepaymentTime > 0) {
    score += 0.10;
  }
  
  // Loan count experience
  if (totalLoans > 20) score += 0.10;
  else if (totalLoans > 10) score += 0.05;
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Calculate DeFi behavior score (0-1)
 * Analyzes: protocol interactions, yield farming patterns, smart contract calls
 */
function calculateDeFiScore(behavior) {
  const {
    protocolCount = 0,
    yieldFarmingActivity = 0, // 0-1 scale
    smartContractCalls = 0,
    defiExperience = 0 // days in DeFi
  } = behavior;
  
  let score = 0.5;
  
  // Protocol diversity
  if (protocolCount > 10) score += 0.15;
  else if (protocolCount > 5) score += 0.10;
  else if (protocolCount > 2) score += 0.05;
  
  // Yield farming (sophisticated behavior)
  score += yieldFarmingActivity * 0.15;
  
  // Smart contract interaction (experience indicator)
  if (smartContractCalls > 100) score += 0.10;
  else if (smartContractCalls > 50) score += 0.07;
  else if (smartContractCalls > 10) score += 0.04;
  
  // DeFi experience
  if (defiExperience > 365) score += 0.10; // 1+ year
  else if (defiExperience > 180) score += 0.07; // 6+ months
  else if (defiExperience > 90) score += 0.04; // 3+ months
  else if (defiExperience < 30) score -= 0.05; // Less than 1 month
  
  return Math.max(0, Math.min(1, score));
}

/**
 * Extract relevant features from borrower and loan data
 */
function extractFeatures(borrowerData, loanData) {
  const {
    totalLoansCount = 0,
    repaidLoansCount = 0,
    defaultedLoansCount = 0,
    totalBorrowed = 0,
    totalRepaid = 0,
    accountAge = 0, // Days since first transaction
    creditScore = 575 // Default middle of 300-850 range
  } = borrowerData;

  const {
    amount,
    collateralAmount,
    duration,
    interestRate,
    collateralRatio
  } = loanData;

  // Normalize credit score from 300-850 range to 0-1
  const normalizedCreditScore = (creditScore - 300) / 550;

  return {
    // Borrower history features
    repaymentRate: totalLoansCount > 0 ? repaidLoansCount / totalLoansCount : 0,
    defaultRate: totalLoansCount > 0 ? defaultedLoansCount / totalLoansCount : 0,
    avgLoanSize: totalLoansCount > 0 ? totalBorrowed / totalLoansCount : 0,
    creditScore: normalizedCreditScore, // Normalize 300-850 to 0-1
    accountAge: Math.min(accountAge / 365, 2), // Normalize to 0-2 years
    
    // Current loan features
    loanToCollateralRatio: amount / collateralAmount,
    normalizedAmount: Math.log(amount + 1) / 20, // Log normalize
    normalizedDuration: duration / (365 * 24 * 3600), // Normalize to years
    normalizedInterestRate: interestRate / 10000 // Normalize interest rate
  };
}

/**
 * Calculate risk score using enhanced heuristic rules
 */
function calculateHeuristicRiskScore(features) {
  let riskScore = 0.5; // Start with medium risk
  
  // Enhanced credit history impact (35% weight)
  const repaymentWeight = 0.25;
  const consistencyWeight = 0.1;
  
  if (features.repaymentRate > 0.95) {
    riskScore -= repaymentWeight * 0.8; // Excellent repayment history
  } else if (features.repaymentRate > 0.85) {
    riskScore -= repaymentWeight * 0.4; // Good repayment history
  } else if (features.repaymentRate < 0.7) {
    riskScore += repaymentWeight * 0.6; // Poor repayment history
  }
  
  // Default rate impact with exponential penalty
  if (features.defaultRate > 0.2) {
    riskScore += 0.25; // Very high default rate
  } else if (features.defaultRate > 0.1) {
    riskScore += 0.15; // High default rate
  } else if (features.defaultRate > 0.05) {
    riskScore += 0.08; // Moderate default rate
  }
  
  // Credit score impact with non-linear scaling (20% weight)
  const creditScoreImpact = Math.pow(0.5 - features.creditScore, 2) * 0.8;
  riskScore += creditScoreImpact;
  
  // Account age impact with loyalty bonus (15% weight)
  if (features.accountAge < 0.1) { // Less than 1 month
    riskScore += 0.15;
  } else if (features.accountAge < 0.25) { // Less than 3 months
    riskScore += 0.1;
  } else if (features.accountAge > 2) { // More than 2 years
    riskScore -= 0.1; // Loyalty bonus
  } else if (features.accountAge > 1) { // More than 1 year
    riskScore -= 0.05;
  }
  
  // Enhanced loan characteristics impact (30% weight)
  // Collateral ratio with non-linear risk curve
  if (features.loanToCollateralRatio > 0.9) {
    riskScore += 0.2; // Very high ratio - dangerous
  } else if (features.loanToCollateralRatio > 0.8) {
    riskScore += 0.15; // High ratio
  } else if (features.loanToCollateralRatio > 0.7) {
    riskScore += 0.08; // Moderate ratio
  } else if (features.loanToCollateralRatio < 0.4) {
    riskScore -= 0.1; // Very conservative ratio
  } else if (features.loanToCollateralRatio < 0.5) {
    riskScore -= 0.05; // Conservative ratio
  }
  
  // Duration risk with curve
  if (features.normalizedDuration > 1.0) { // > 1 year
    riskScore += 0.12;
  } else if (features.normalizedDuration > 0.5) { // > 6 months
    riskScore += 0.06;
  } else if (features.normalizedDuration < 0.1) { // < 1 month
    riskScore += 0.03; // Very short loans can be risky too
  }
  
  // Interest rate analysis (market risk indicator)
  if (features.normalizedInterestRate > 0.25) { // > 25%
    riskScore += 0.15; // Extremely high rates indicate desperation
  } else if (features.normalizedInterestRate > 0.15) { // > 15%
    riskScore += 0.08;
  } else if (features.normalizedInterestRate < 0.03) { // < 3%
    riskScore += 0.02; // Suspiciously low rates
  }
  
  // Loan size risk adjustment
  if (features.normalizedAmount > 15) { // Very large loans
    riskScore += 0.05;
  } else if (features.normalizedAmount < 1) { // Very small loans
    riskScore += 0.02; // Small risk increase for tiny loans
  }
  
  // Ensure score is between 0 and 1
  return Math.max(0, Math.min(1, riskScore));
}

/**
 * Calculate dynamic interest rate recommendation
 * @param {number} riskScore - Risk score from 0-1000
 * @param {Object} marketData - Current market conditions
 * @returns {number} Recommended interest rate in basis points
 */
export function calculateDynamicInterestRate(riskScore, marketData = {}) {
  const {
    baseRate = 300, // 3% base rate
    volatility = 0.1,
    demandSupplyRatio = 1.0,
    platformFeeRate = 50 // 0.5%
  } = marketData;
  
  // Risk premium calculation (0-20%)
  const riskPremium = Math.min((riskScore / 1000) * 2000, 2000);
  
  // Market adjustment based on supply/demand
  const marketAdjustment = (demandSupplyRatio - 1) * 200; // ±2%
  
  // Volatility premium
  const volatilityPremium = volatility * 100; // Up to 1%
  
  // Calculate final rate
  const recommendedRate = baseRate + riskPremium + marketAdjustment + volatilityPremium + platformFeeRate;
  
  // Cap between 1% and 50%
  return Math.max(100, Math.min(5000, Math.round(recommendedRate)));
}

/**
 * Get risk category based on score
 */
export function getRiskCategory(riskScore) {
  if (riskScore <= 300) return 'Low';
  if (riskScore <= 600) return 'Medium';
  if (riskScore <= 800) return 'High';
  return 'Very High';
}

/**
 * Get recommended interest rate based on risk score
 */
export function getRecommendedInterestRate(riskScore) {
  // Base rate + risk premium
  const baseRate = 300; // 3% in basis points
  const riskPremium = (riskScore / 1000) * 1500; // Up to 15% risk premium
  
  return Math.round(baseRate + riskPremium);
}

/**
 * Get current ML service status
 */
export function getMlStatus() {
  return {
    available: mlAvailable,
    tensorflow: tf !== null,
    model: model !== null
  };
}