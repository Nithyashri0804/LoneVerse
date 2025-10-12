import { ethers } from 'ethers';
import fs from 'fs/promises';
import path from 'path';

/**
 * Dataset Generator for LoanVerse Credit Scoring System
 * Generates 1000+ synthetic wallet addresses with historical transaction data
 * for testing, validation, and model training
 */

/**
 * Generate a deterministic wallet address from a seed
 */
function generateWalletAddress(seed) {
  // Create deterministic private key from seed
  const privateKey = ethers.keccak256(ethers.toUtf8Bytes(`wallet_seed_${seed}`));
  const wallet = new ethers.Wallet(privateKey);
  return wallet.address;
}

/**
 * Generate transaction metrics for a wallet
 */
function generateTransactionMetrics(walletId, riskProfile) {
  const seed = parseInt(ethers.keccak256(ethers.toUtf8Bytes(walletId + 'tx')).slice(2, 10), 16);
  const random = (seed % 1000) / 1000;
  
  // Adjust metrics based on risk profile
  const baseMultiplier = riskProfile === 'low' ? 1.5 : riskProfile === 'medium' ? 1.0 : 0.6;
  
  const txCount = Math.floor(50 + random * 500 * baseMultiplier);
  const totalVolume = (10 + random * 990) * baseMultiplier;
  const avgFrequency = (1 + random * 9) * baseMultiplier; // tx per day
  const avgTimeBetween = 86400 / Math.max(avgFrequency, 0.1); // seconds
  
  return {
    txCount,
    totalVolume: parseFloat(totalVolume.toFixed(4)),
    avgFrequency: parseFloat(avgFrequency.toFixed(2)),
    avgTimeBetween: Math.floor(avgTimeBetween),
    currentBalance: parseFloat((random * 50 * baseMultiplier).toFixed(4)),
    recentTxCount: Math.floor(10 + random * 40)
  };
}

/**
 * Generate portfolio stability metrics
 */
function generatePortfolioMetrics(walletId, riskProfile) {
  const seed = parseInt(ethers.keccak256(ethers.toUtf8Bytes(walletId + 'portfolio')).slice(2, 10), 16);
  const random = (seed % 1000) / 1000;
  
  const baseStability = riskProfile === 'low' ? 0.8 : riskProfile === 'medium' ? 0.5 : 0.2;
  
  const stablecoinRatio = Math.min(baseStability + random * 0.2, 1.0);
  const avgHoldingPeriod = Math.floor(30 + random * 335 * (baseStability + 0.5)); // days
  const volatilityIndex = Math.max(0.1, (1 - baseStability) + random * 0.3);
  const diversityScore = Math.min(baseStability + random * 0.3, 1.0);
  
  return {
    stablecoinRatio: parseFloat(stablecoinRatio.toFixed(3)),
    avgHoldingPeriod,
    volatilityIndex: parseFloat(volatilityIndex.toFixed(3)),
    diversityScore: parseFloat(diversityScore.toFixed(3)),
    currentBalance: parseFloat((random * 100).toFixed(4))
  };
}

/**
 * Generate lending history
 */
function generateLendingHistory(walletId, riskProfile) {
  const seed = parseInt(ethers.keccak256(ethers.toUtf8Bytes(walletId + 'lending')).slice(2, 10), 16);
  const random = (seed % 1000) / 1000;
  
  const baseReliability = riskProfile === 'low' ? 0.95 : riskProfile === 'medium' ? 0.80 : 0.60;
  
  const totalLoans = Math.floor(1 + random * 20);
  const successfulRepayments = Math.floor(totalLoans * (baseReliability + random * 0.05));
  const defaultCount = totalLoans - successfulRepayments;
  const repaymentRate = totalLoans > 0 ? successfulRepayments / totalLoans : 1.0;
  
  const totalBorrowed = parseFloat((random * 500 + 10).toFixed(2));
  const totalRepaid = parseFloat((totalBorrowed * repaymentRate).toFixed(2));
  const activeLoans = Math.floor(random * 3);
  
  return {
    totalLoans,
    successfulRepayments,
    defaultCount,
    repaymentRate: parseFloat(repaymentRate.toFixed(3)),
    totalBorrowed,
    totalRepaid,
    activeLoans,
    avgLoanAmount: parseFloat((totalBorrowed / Math.max(totalLoans, 1)).toFixed(2))
  };
}

/**
 * Generate DeFi behavior metrics
 */
function generateDeFiBehavior(walletId, riskProfile) {
  const seed = parseInt(ethers.keccak256(ethers.toUtf8Bytes(walletId + 'defi')).slice(2, 10), 16);
  const random = (seed % 1000) / 1000;
  
  const baseActivity = riskProfile === 'low' ? 0.7 : riskProfile === 'medium' ? 0.5 : 0.3;
  
  const protocolCount = Math.floor(1 + random * 15 * baseActivity);
  const yieldFarmingActivity = Math.min(baseActivity + random * 0.3, 1.0);
  const smartContractCalls = Math.floor(10 + random * 190 * baseActivity);
  const defiExperience = Math.floor(30 + random * 700 * baseActivity); // days
  
  const protocols = ['Uniswap', 'Aave', 'Compound', 'MakerDAO', 'Curve', 'Yearn', 'Balancer'];
  const knownDeFiProtocols = protocols.slice(0, Math.min(protocolCount, protocols.length));
  
  return {
    protocolCount,
    yieldFarmingActivity: parseFloat(yieldFarmingActivity.toFixed(3)),
    smartContractCalls,
    defiExperience,
    uniqueProtocols: protocolCount,
    knownDeFiProtocols
  };
}

/**
 * Calculate credit score using the weighted algorithm
 */
function calculateCreditScore(transactionMetrics, portfolioMetrics, lendingHistory, defiBehavior) {
  // Transaction Analysis Score (30%)
  const txScore = Math.min(
    (transactionMetrics.txCount / 500) * 0.4 +
    (Math.min(transactionMetrics.totalVolume, 1000) / 1000) * 0.3 +
    (Math.min(transactionMetrics.avgFrequency, 10) / 10) * 0.3,
    1.0
  );
  
  // Portfolio Stability Score (25%)
  const portfolioScore = Math.min(
    portfolioMetrics.stablecoinRatio * 0.3 +
    (Math.min(portfolioMetrics.avgHoldingPeriod, 365) / 365) * 0.3 +
    (1 - portfolioMetrics.volatilityIndex) * 0.2 +
    portfolioMetrics.diversityScore * 0.2,
    1.0
  );
  
  // Lending History Score (25%)
  const lendingScore = Math.min(
    lendingHistory.repaymentRate * 0.5 +
    (1 - Math.min(lendingHistory.defaultCount / 10, 1)) * 0.3 +
    (Math.min(lendingHistory.totalLoans, 20) / 20) * 0.2,
    1.0
  );
  
  // DeFi Behavior Score (20%)
  const defiScore = Math.min(
    (Math.min(defiBehavior.protocolCount, 15) / 15) * 0.3 +
    defiBehavior.yieldFarmingActivity * 0.3 +
    (Math.min(defiBehavior.smartContractCalls, 200) / 200) * 0.2 +
    (Math.min(defiBehavior.defiExperience, 730) / 730) * 0.2,
    1.0
  );
  
  // Weighted sum (normalized 0-1)
  const normalizedScore = 
    txScore * 0.30 +
    portfolioScore * 0.25 +
    lendingScore * 0.25 +
    defiScore * 0.20;
  
  // Convert to 300-850 scale
  const creditScore = Math.round(300 + normalizedScore * 550);
  
  return {
    creditScore: Math.max(300, Math.min(850, creditScore)),
    normalizedScore: parseFloat(normalizedScore.toFixed(4)),
    componentScores: {
      transaction: parseFloat(txScore.toFixed(4)),
      portfolio: parseFloat(portfolioScore.toFixed(4)),
      lending: parseFloat(lendingScore.toFixed(4)),
      defi: parseFloat(defiScore.toFixed(4))
    }
  };
}

/**
 * Generate a single wallet dataset entry
 */
function generateWalletData(index) {
  // Distribute risk profiles: 30% low, 50% medium, 20% high
  let riskProfile;
  if (index % 10 < 3) riskProfile = 'low';
  else if (index % 10 < 8) riskProfile = 'medium';
  else riskProfile = 'high';
  
  // Generate deterministic wallet address from index
  const walletAddress = generateWalletAddress(index);
  
  const transactionMetrics = generateTransactionMetrics(walletAddress, riskProfile);
  const portfolioMetrics = generatePortfolioMetrics(walletAddress, riskProfile);
  const lendingHistory = generateLendingHistory(walletAddress, riskProfile);
  const defiBehavior = generateDeFiBehavior(walletAddress, riskProfile);
  
  const { creditScore, normalizedScore, componentScores } = calculateCreditScore(
    transactionMetrics,
    portfolioMetrics,
    lendingHistory,
    defiBehavior
  );
  
  return {
    id: index + 1,
    walletAddress,
    riskProfile,
    creditScore,
    normalizedScore,
    componentScores,
    transactionAnalysis: transactionMetrics,
    portfolioStability: portfolioMetrics,
    lendingHistory,
    defiBehavior
  };
}

/**
 * Generate complete dataset
 */
export async function generateDataset(count = 1000) {
  console.log(`📊 Generating dataset with ${count} wallet entries...`);
  
  const dataset = [];
  const batchSize = 100;
  
  for (let i = 0; i < count; i++) {
    dataset.push(generateWalletData(i));
    
    if ((i + 1) % batchSize === 0) {
      console.log(`  Generated ${i + 1}/${count} entries...`);
    }
  }
  
  // Calculate statistics
  const stats = {
    totalWallets: count,
    creditScoreDistribution: {
      excellent: dataset.filter(d => d.creditScore >= 750).length,
      good: dataset.filter(d => d.creditScore >= 650 && d.creditScore < 750).length,
      fair: dataset.filter(d => d.creditScore >= 550 && d.creditScore < 650).length,
      poor: dataset.filter(d => d.creditScore >= 450 && d.creditScore < 550).length,
      veryPoor: dataset.filter(d => d.creditScore < 450).length
    },
    riskProfileDistribution: {
      low: dataset.filter(d => d.riskProfile === 'low').length,
      medium: dataset.filter(d => d.riskProfile === 'medium').length,
      high: dataset.filter(d => d.riskProfile === 'high').length
    },
    averageCreditScore: Math.round(dataset.reduce((sum, d) => sum + d.creditScore, 0) / count)
  };
  
  console.log('✅ Dataset generation complete!');
  console.log(`📈 Average Credit Score: ${stats.averageCreditScore}`);
  console.log(`📊 Distribution: Excellent(${stats.creditScoreDistribution.excellent}) Good(${stats.creditScoreDistribution.good}) Fair(${stats.creditScoreDistribution.fair}) Poor(${stats.creditScoreDistribution.poor}) VeryPoor(${stats.creditScoreDistribution.veryPoor})`);
  
  return {
    dataset,
    statistics: stats
  };
}

/**
 * Save dataset to file
 */
export async function saveDataset(datasetResult, filename = 'wallet_dataset.json') {
  const dataDir = path.join(process.cwd(), 'data');
  
  // Create data directory if it doesn't exist
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  const filepath = path.join(dataDir, filename);
  await fs.writeFile(filepath, JSON.stringify(datasetResult, null, 2));
  
  console.log(`💾 Dataset saved to: ${filepath}`);
  return filepath;
}

/**
 * Export dataset to CSV format for analysis
 */
export async function exportToCSV(datasetResult, filename = 'wallet_dataset.csv') {
  const dataDir = path.join(process.cwd(), 'data');
  
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  // CSV header
  const headers = [
    'ID', 'WalletAddress', 'RiskProfile', 'CreditScore', 'NormalizedScore',
    'TxScore', 'PortfolioScore', 'LendingScore', 'DefiScore',
    'TxCount', 'TotalVolume', 'AvgFrequency', 'CurrentBalance',
    'StablecoinRatio', 'AvgHoldingPeriod', 'VolatilityIndex', 'DiversityScore',
    'TotalLoans', 'RepaymentRate', 'DefaultCount', 'TotalBorrowed', 'TotalRepaid',
    'ProtocolCount', 'YieldFarmingActivity', 'SmartContractCalls', 'DefiExperience'
  ].join(',');
  
  // CSV rows
  const rows = datasetResult.dataset.map(d => [
    d.id,
    d.walletAddress,
    d.riskProfile,
    d.creditScore,
    d.normalizedScore,
    d.componentScores.transaction,
    d.componentScores.portfolio,
    d.componentScores.lending,
    d.componentScores.defi,
    d.transactionAnalysis.txCount,
    d.transactionAnalysis.totalVolume,
    d.transactionAnalysis.avgFrequency,
    d.transactionAnalysis.currentBalance,
    d.portfolioStability.stablecoinRatio,
    d.portfolioStability.avgHoldingPeriod,
    d.portfolioStability.volatilityIndex,
    d.portfolioStability.diversityScore,
    d.lendingHistory.totalLoans,
    d.lendingHistory.repaymentRate,
    d.lendingHistory.defaultCount,
    d.lendingHistory.totalBorrowed,
    d.lendingHistory.totalRepaid,
    d.defiBehavior.protocolCount,
    d.defiBehavior.yieldFarmingActivity,
    d.defiBehavior.smartContractCalls,
    d.defiBehavior.defiExperience
  ].join(','));
  
  const csvContent = [headers, ...rows].join('\n');
  
  const filepath = path.join(dataDir, filename);
  await fs.writeFile(filepath, csvContent);
  
  console.log(`📄 CSV exported to: ${filepath}`);
  return filepath;
}

export default {
  generateDataset,
  saveDataset,
  exportToCSV
};
