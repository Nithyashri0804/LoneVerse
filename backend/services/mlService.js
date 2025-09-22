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
 * @returns {number} Risk score between 0-1000
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
    creditScore = 500
  } = borrowerData;

  const {
    amount,
    collateralAmount,
    duration,
    interestRate,
    collateralRatio
  } = loanData;

  return {
    // Borrower history features
    repaymentRate: totalLoansCount > 0 ? repaidLoansCount / totalLoansCount : 0,
    defaultRate: totalLoansCount > 0 ? defaultedLoansCount / totalLoansCount : 0,
    avgLoanSize: totalLoansCount > 0 ? totalBorrowed / totalLoansCount : 0,
    creditScore: creditScore / 1000, // Normalize to 0-1
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