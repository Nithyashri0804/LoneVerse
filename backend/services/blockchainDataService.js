import axios from 'axios';
import { ethers } from 'ethers';

/**
 * Blockchain Data Service
 * Fetches real on-chain data from various sources (Etherscan, Alchemy, etc.)
 * Falls back to deterministic mock data for local development
 */

/**
 * Fetch transaction history from Etherscan API
 * @param {string} address - Wallet address
 * @param {string} network - Network name (mainnet, sepolia, etc.)
 * @returns {Array} Transaction history
 */
export async function fetchTransactionHistory(address, network = 'mainnet') {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️ ETHERSCAN_API_KEY not set, using deterministic mock data');
    return null; // Will trigger mock data fallback
  }
  
  try {
    const baseUrls = {
      mainnet: 'https://api.etherscan.io/api',
      sepolia: 'https://api-sepolia.etherscan.io/api',
      goerli: 'https://api-goerli.etherscan.io/api'
    };
    
    const baseUrl = baseUrls[network] || baseUrls.mainnet;
    
    // Fetch normal transactions
    const normalTxResponse = await axios.get(baseUrl, {
      params: {
        module: 'account',
        action: 'txlist',
        address,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 1000, // Last 1000 transactions
        sort: 'desc',
        apikey: apiKey
      },
      timeout: 10000
    });
    
    // Fetch internal transactions  
    const internalTxResponse = await axios.get(baseUrl, {
      params: {
        module: 'account',
        action: 'txlistinternal',
        address,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 1000,
        sort: 'desc',
        apikey: apiKey
      },
      timeout: 10000
    });
    
    const normalTx = normalTxResponse.data.result || [];
    const internalTx = internalTxResponse.data.result || [];
    
    // Combine and sort by timestamp
    const allTx = [...normalTx, ...internalTx].sort((a, b) => 
      parseInt(b.timeStamp) - parseInt(a.timeStamp)
    );
    
    console.log(`✅ Fetched ${allTx.length} real transactions from Etherscan`);
    
    return allTx.map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to || tx.contractAddress,
      value: tx.value,
      timestamp: parseInt(tx.timeStamp),
      blockNumber: parseInt(tx.blockNumber),
      data: tx.input || '0x',
      gasUsed: tx.gasUsed,
      isError: tx.isError === '1'
    }));
    
  } catch (error) {
    console.error('Error fetching from Etherscan:', error.message);
    return null; // Trigger fallback
  }
}

/**
 * Fetch ERC20 token balances
 * @param {string} address - Wallet address  
 * @param {string} network - Network name
 * @returns {Array} Token balances
 */
export async function fetchTokenBalances(address, network = 'mainnet') {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  
  if (!apiKey) {
    return null;
  }
  
  try {
    const baseUrls = {
      mainnet: 'https://api.etherscan.io/api',
      sepolia: 'https://api-sepolia.etherscan.io/api',
      goerli: 'https://api-goerli.etherscan.io/api'
    };
    
    const baseUrl = baseUrls[network] || baseUrls.mainnet;
    
    const response = await axios.get(baseUrl, {
      params: {
        module: 'account',
        action: 'tokentx',
        address,
        page: 1,
        offset: 100,
        sort: 'desc',
        apikey: apiKey
      },
      timeout: 10000
    });
    
    const tokenTxs = response.data.result || [];
    
    // Extract unique tokens
    const tokens = new Map();
    tokenTxs.forEach(tx => {
      if (!tokens.has(tx.contractAddress)) {
        tokens.set(tx.contractAddress, {
          address: tx.contractAddress,
          symbol: tx.tokenSymbol,
          name: tx.tokenName,
          decimals: parseInt(tx.tokenDecimal),
          lastSeen: parseInt(tx.timeStamp)
        });
      }
    });
    
    console.log(`✅ Found ${tokens.size} unique tokens`);
    return Array.from(tokens.values());
    
  } catch (error) {
    console.error('Error fetching token balances:', error.message);
    return null;
  }
}

/**
 * Identify stablecoins from token list
 */
export function identifyStablecoins(tokens) {
  const stablecoinSymbols = new Set([
    'USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'GUSD', 'FRAX', 'LUSD', 'UST'
  ]);
  
  return tokens.filter(token => 
    stablecoinSymbols.has(token.symbol.toUpperCase())
  );
}

/**
 * Identify DeFi protocols from contract addresses
 * @param {Array} transactions - Transaction list
 * @returns {Set} Unique DeFi protocols
 */
export function identifyDeFiProtocols(transactions) {
  // Known DeFi protocol addresses (mainnet examples)
  const knownProtocols = {
    // Uniswap
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': 'Uniswap V2 Router',
    '0xe592427a0aece92de3edee1f18e0157c05861564': 'Uniswap V3 Router',
    
    // Aave
    '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9': 'Aave V2 Lending Pool',
    '0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2': 'Aave V3 Pool',
    
    // Compound
    '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b': 'Compound Comptroller',
    
    // MakerDAO
    '0x9759a6ac90977b93b58547b4a71c78317f391a28': 'MakerDAO CDP Manager',
    
    // Curve
    '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7': 'Curve 3pool',
    
    // Yearn
    '0xa258c4606ca8206d8aa700ce2143d7db854d168c': 'Yearn WETH Vault',
  };
  
  const protocols = new Set();
  
  transactions.forEach(tx => {
    const address = tx.to?.toLowerCase();
    if (address && knownProtocols[address]) {
      protocols.add(knownProtocols[address]);
    }
  });
  
  return protocols;
}

/**
 * Analyze yield farming activity from transaction patterns
 */
export function analyzeYieldFarmingActivity(transactions) {
  // Look for deposit/withdraw patterns typical of yield farming
  let farmingTxCount = 0;
  
  transactions.forEach(tx => {
    if (tx.data && tx.data.length > 10) {
      // Check for common DeFi function signatures
      const methodId = tx.data.slice(0, 10).toLowerCase();
      
      // Deposit, withdraw, stake, unstake, harvest function signatures
      const farmingSigs = [
        '0xb6b55f25', // deposit
        '0x2e1a7d4d', // withdraw
        '0xa694fc3a', // stake
        '0x2e17de78', // unstake
        '0x4641257d', // harvest/claim
      ];
      
      if (farmingSigs.includes(methodId)) {
        farmingTxCount++;
      }
    }
  });
  
  return farmingTxCount / Math.max(transactions.length, 1);
}

export default {
  fetchTransactionHistory,
  fetchTokenBalances,
  identifyStablecoins,
  identifyDeFiProtocols,
  analyzeYieldFarmingActivity
};
