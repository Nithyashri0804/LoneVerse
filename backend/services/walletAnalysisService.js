import { ethers } from 'ethers';

/**
 * Wallet Analysis Service
 * Analyzes wallet addresses to extract transaction metrics, portfolio data, and DeFi behavior
 * for credit scoring purposes
 */

/**
 * Analyze wallet address for transaction metrics
 * @param {string} walletAddress - The wallet address to analyze
 * @param {object} provider - Ethers provider instance
 * @returns {object} Transaction metrics
 */
export async function analyzeTransactionMetrics(walletAddress, provider) {
  try {
    console.log(`📊 Analyzing transaction metrics for ${walletAddress}...`);
    
    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - 10000); // Last 10k blocks (~2 days on mainnet)
    
    // Get transaction count
    const txCount = await provider.getTransactionCount(walletAddress);
    
    // Get wallet balance
    const balance = await provider.getBalance(walletAddress);
    const balanceInEth = parseFloat(ethers.formatEther(balance));
    
    // Fetch recent transactions (note: this requires an archive node or block explorer API)
    // For demo, we'll estimate based on available data
    const transactions = await fetchRecentTransactions(walletAddress, provider, startBlock, currentBlock);
    
    // Calculate metrics
    const totalVolume = transactions.reduce((sum, tx) => {
      const value = parseFloat(ethers.formatEther(tx.value || 0));
      return sum + value;
    }, 0);
    
    const avgFrequency = transactions.length > 0 
      ? transactions.length / ((currentBlock - startBlock) / 7200) // Blocks per day
      : 0;
    
    const avgTimeBetween = transactions.length > 1
      ? calculateAvgTimeBetween(transactions)
      : 0;
    
    return {
      txCount,
      totalVolume,
      avgFrequency,
      avgTimeBetween,
      currentBalance: balanceInEth,
      recentTxCount: transactions.length,
      analysisTimestamp: Date.now()
    };
    
  } catch (error) {
    console.error('Error analyzing transaction metrics:', error);
    // Return mock data for development
    return generateMockTransactionMetrics(walletAddress);
  }
}

/**
 * Analyze portfolio stability
 * @param {string} walletAddress - The wallet address to analyze
 * @param {object} provider - Ethers provider instance
 * @returns {object} Portfolio stability metrics
 */
export async function analyzePortfolioStability(walletAddress, provider) {
  try {
    console.log(`💼 Analyzing portfolio stability for ${walletAddress}...`);
    
    // This would require token balance queries via ERC20 contracts
    // For now, we'll use estimation based on transaction patterns
    
    const balance = await provider.getBalance(walletAddress);
    const balanceInEth = parseFloat(ethers.formatEther(balance));
    
    // Get network for API calls
    const network = await provider.getNetwork();
    const networkName = network.chainId === 1n ? 'mainnet' : 
                       network.chainId === 11155111n ? 'sepolia' : 
                       'mainnet';
    
    // Estimate stablecoin ratio (uses real token data when available)
    const stablecoinRatio = await estimateStablecoinRatio(walletAddress, networkName);
    
    // Estimate holding period based on account age
    const avgHoldingPeriod = await estimateHoldingPeriod(walletAddress, provider);
    
    // Volatility based on balance changes
    const volatilityIndex = calculateVolatilityIndex(balanceInEth);
    
    // Diversity score (estimated)
    const diversityScore = estimateDiversityScore(walletAddress);
    
    return {
      stablecoinRatio,
      avgHoldingPeriod,
      volatilityIndex,
      diversityScore,
      currentBalance: balanceInEth,
      analysisTimestamp: Date.now()
    };
    
  } catch (error) {
    console.error('Error analyzing portfolio stability:', error);
    return generateMockPortfolioMetrics(walletAddress);
  }
}

/**
 * Analyze DeFi behavior
 * @param {string} walletAddress - The wallet address to analyze
 * @param {object} provider - Ethers provider instance
 * @returns {object} DeFi behavior metrics
 */
export async function analyzeDeFiBehavior(walletAddress, provider) {
  try {
    console.log(`🔗 Analyzing DeFi behavior for ${walletAddress}...`);
    
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - 10000);
    
    // Get recent transactions
    const transactions = await fetchRecentTransactions(walletAddress, provider, startBlock, currentBlock);
    
    // Import DeFi analysis functions
    const { identifyDeFiProtocols, analyzeYieldFarmingActivity } = await import('./blockchainDataService.js');
    
    // Count smart contract interactions (transactions to contracts)
    const smartContractCalls = transactions.filter(tx => tx.to && tx.data !== '0x').length;
    
    // Identify unique protocols (enhanced with known DeFi protocols)
    const knownProtocols = identifyDeFiProtocols(transactions);
    const uniqueContracts = new Set(transactions.filter(tx => tx.to).map(tx => tx.to.toLowerCase()));
    const protocolCount = Math.max(knownProtocols.size, uniqueContracts.size);
    
    // Analyze yield farming activity using transaction patterns
    const yieldFarmingActivity = analyzeYieldFarmingActivity(transactions);
    
    // Calculate DeFi experience (days)
    const firstTx = transactions.length > 0 ? transactions[transactions.length - 1] : null;
    const defiExperience = firstTx 
      ? Math.floor((Date.now() - firstTx.timestamp * 1000) / (1000 * 60 * 60 * 24))
      : 0;
    
    return {
      protocolCount,
      yieldFarmingActivity,
      smartContractCalls,
      defiExperience,
      uniqueProtocols: protocolCount,
      knownDeFiProtocols: Array.from(knownProtocols),
      analysisTimestamp: Date.now()
    };
    
  } catch (error) {
    console.error('Error analyzing DeFi behavior:', error);
    return generateMockDeFiMetrics(walletAddress);
  }
}

/**
 * Fetch recent transactions for a wallet
 * Uses Etherscan API when available, falls back to deterministic mock data
 */
async function fetchRecentTransactions(walletAddress, provider, startBlock, endBlock) {
  try {
    // Try to fetch real data from Etherscan if API key is configured
    const { fetchTransactionHistory } = await import('./blockchainDataService.js');
    
    // Determine network from provider
    const network = await provider.getNetwork();
    const networkName = network.chainId === 1n ? 'mainnet' : 
                       network.chainId === 11155111n ? 'sepolia' : 
                       'mainnet';
    
    const realTxs = await fetchTransactionHistory(walletAddress, networkName);
    
    if (realTxs && realTxs.length > 0) {
      console.log(`✅ Using ${realTxs.length} real transactions from blockchain`);
      return realTxs;
    }
    
    // Fallback to deterministic mock data for local development
    console.log(`📝 Using deterministic mock data for ${walletAddress}`);
    return generateMockTransactions(walletAddress, 50);
    
  } catch (error) {
    console.error('Error fetching transactions:', error);
    // Fallback to mock data
    return generateMockTransactions(walletAddress, 50);
  }
}

/**
 * Calculate average time between transactions
 */
function calculateAvgTimeBetween(transactions) {
  if (transactions.length < 2) return 0;
  
  const sortedTxs = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
  const timeDiffs = [];
  
  for (let i = 1; i < sortedTxs.length; i++) {
    const diff = sortedTxs[i].timestamp - sortedTxs[i-1].timestamp;
    timeDiffs.push(diff / 3600); // Convert to hours
  }
  
  return timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
}

/**
 * Estimate stablecoin ratio
 * Uses real token data when available, falls back to deterministic estimate
 */
async function estimateStablecoinRatio(walletAddress, network = 'mainnet') {
  try {
    const { fetchTokenBalances, identifyStablecoins } = await import('./blockchainDataService.js');
    
    const tokens = await fetchTokenBalances(walletAddress, network);
    
    if (tokens && tokens.length > 0) {
      const stablecoins = identifyStablecoins(tokens);
      const ratio = stablecoins.length / Math.max(tokens.length, 1);
      console.log(`✅ Real stablecoin ratio: ${ratio.toFixed(2)}`);
      return ratio;
    }
  } catch (error) {
    console.error('Error getting stablecoin ratio:', error);
  }
  
  // Fallback to deterministic estimate
  const hash = ethers.keccak256(ethers.toUtf8Bytes(walletAddress));
  const seed = parseInt(hash.slice(2, 10), 16);
  return (seed % 60 + 20) / 100; // 0.2 to 0.8
}

/**
 * Estimate holding period (mock implementation)
 */
async function estimateHoldingPeriod(walletAddress, provider) {
  // In production: analyze token transfer history
  const txCount = await provider.getTransactionCount(walletAddress);
  return Math.min(txCount * 2, 365); // Rough estimate in days
}

/**
 * Calculate volatility index
 */
function calculateVolatilityIndex(balance) {
  // Simplified volatility calculation
  // In production: analyze balance history over time
  if (balance < 0.1) return 0.8; // High volatility for small balances
  if (balance < 1) return 0.6;
  if (balance < 10) return 0.4;
  return 0.3; // Lower volatility for larger balances
}

/**
 * Estimate portfolio diversity
 */
function estimateDiversityScore(walletAddress) {
  // In production: count unique tokens held
  const hash = ethers.keccak256(ethers.toUtf8Bytes(walletAddress));
  const seed = parseInt(hash.slice(2, 10), 16);
  return (seed % 80 + 20) / 100; // 0.2 to 1.0
}

/**
 * Generate mock transaction data for development
 */
function generateMockTransactions(walletAddress, count) {
  const transactions = [];
  const now = Math.floor(Date.now() / 1000);
  const hash = ethers.keccak256(ethers.toUtf8Bytes(walletAddress));
  const seed = parseInt(hash.slice(2, 10), 16);
  
  for (let i = 0; i < count; i++) {
    transactions.push({
      hash: ethers.keccak256(ethers.toUtf8Bytes(`${walletAddress}${i}`)),
      from: walletAddress,
      to: `0x${(seed + i).toString(16).padStart(40, '0')}`,
      value: ethers.parseEther(((seed % 10) / 10).toString()),
      timestamp: now - (i * 3600 * 24), // Daily transactions
      data: i % 3 === 0 ? `0x${'a'.repeat(200)}` : '0x',
      blockNumber: 1000000 - i * 100
    });
  }
  
  return transactions;
}

/**
 * Generate mock transaction metrics for development
 */
function generateMockTransactionMetrics(walletAddress) {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(walletAddress));
  const seed = parseInt(hash.slice(2, 10), 16);
  
  return {
    txCount: 50 + (seed % 500),
    totalVolume: (seed % 1000) / 10,
    avgFrequency: (seed % 50) / 10,
    avgTimeBetween: 24 + (seed % 144),
    currentBalance: (seed % 100) / 10,
    recentTxCount: 20 + (seed % 30),
    analysisTimestamp: Date.now()
  };
}

/**
 * Generate mock portfolio metrics for development
 */
function generateMockPortfolioMetrics(walletAddress) {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(walletAddress));
  const seed = parseInt(hash.slice(2, 10), 16);
  
  return {
    stablecoinRatio: (seed % 60 + 20) / 100,
    avgHoldingPeriod: 30 + (seed % 300),
    volatilityIndex: (seed % 50 + 20) / 100,
    diversityScore: (seed % 80 + 20) / 100,
    currentBalance: (seed % 100) / 10,
    analysisTimestamp: Date.now()
  };
}

/**
 * Generate mock DeFi metrics for development
 */
function generateMockDeFiMetrics(walletAddress) {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(walletAddress));
  const seed = parseInt(hash.slice(2, 10), 16);
  
  return {
    protocolCount: 2 + (seed % 10),
    yieldFarmingActivity: (seed % 80) / 100,
    smartContractCalls: 10 + (seed % 100),
    defiExperience: 30 + (seed % 300),
    uniqueProtocols: 2 + (seed % 10),
    analysisTimestamp: Date.now()
  };
}

/**
 * Complete wallet analysis - combines all metrics
 * @param {string} walletAddress - The wallet address to analyze
 * @param {object} lendingHistory - Historical lending data from contracts
 * @returns {object} Complete wallet analysis
 */
export async function analyzeWallet(walletAddress, lendingHistory = {}) {
  try {
    // Get provider (use environment variable or default to localhost)
    const rpcUrl = process.env.RPC_URL || 'http://localhost:8000';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Run all analyses in parallel
    const [transactionMetrics, portfolioStability, defiBehavior] = await Promise.all([
      analyzeTransactionMetrics(walletAddress, provider),
      analyzePortfolioStability(walletAddress, provider),
      analyzeDeFiBehavior(walletAddress, provider)
    ]);
    
    return {
      walletAddress,
      transactionMetrics,
      portfolioStability,
      lendingHistory,
      defiBehavior,
      analysisTimestamp: Date.now()
    };
    
  } catch (error) {
    console.error('Error in wallet analysis:', error);
    throw error;
  }
}

export default {
  analyzeWallet,
  analyzeTransactionMetrics,
  analyzePortfolioStability,
  analyzeDeFiBehavior
};
