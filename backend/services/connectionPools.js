import axios from 'axios';
import http from 'http';
import https from 'https';
import { createClient } from 'redis';
import { ethers } from 'ethers';

const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  scheduling: 'lifo'
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  scheduling: 'lifo',
  rejectUnauthorized: true
});

const pooledAxios = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 30000,
  headers: {
    'Connection': 'keep-alive'
  }
});

pooledAxios.interceptors.response.use(
  response => response,
  error => {
    console.error('Pooled axios error:', error.message);
    return Promise.reject(error);
  }
);

class RedisPool {
  constructor() {
    this.client = null;
    this.connected = false;
    this.connectionPromise = null;
  }

  async connect() {
    if (this.connected && this.client) {
      return this.client;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  async _connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ Redis max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            const delay = Math.min(retries * 100, 3000);
            console.log(`🔄 Redis reconnecting in ${delay}ms...`);
            return delay;
          },
          connectTimeout: 10000,
          keepAlive: 30000
        },
        pingInterval: 15000
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis client error:', err.message);
        this.connected = false;
      });

      this.client.on('ready', () => {
        console.log('✅ Redis connection pool ready');
        this.connected = true;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
        this.connected = false;
      });

      await this.client.connect();
      this.connected = true;
      this.connectionPromise = null;
      
      return this.client;
    } catch (error) {
      console.error('❌ Redis connection failed:', error.message);
      console.log('⚠️ Running without Redis cache');
      this.connectionPromise = null;
      this.connected = false;
      return null;
    }
  }

  async get(key) {
    if (!this.connected || !this.client) {
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis get error:', error.message);
      return null;
    }
  }

  async set(key, value, expirySeconds = 3600) {
    if (!this.connected || !this.client) {
      return false;
    }

    try {
      await this.client.set(key, value, {
        EX: expirySeconds
      });
      return true;
    } catch (error) {
      console.error('Redis set error:', error.message);
      return false;
    }
  }

  async del(key) {
    if (!this.connected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error.message);
      return false;
    }
  }

  async exists(key) {
    if (!this.connected || !this.client) {
      return false;
    }

    try {
      return (await this.client.exists(key)) === 1;
    } catch (error) {
      console.error('Redis exists error:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        await this.client.quit();
        this.connected = false;
        console.log('✅ Redis disconnected gracefully');
      } catch (error) {
        console.error('Error disconnecting Redis:', error.message);
      }
    }
  }

  isConnected() {
    return this.connected;
  }
}

class BlockchainProviderPool {
  constructor() {
    this.providers = new Map();
    this.defaultRpcUrl = process.env.RPC_URL || 'http://localhost:8545';
  }

  getProvider(rpcUrl = null) {
    const url = rpcUrl || this.defaultRpcUrl;
    
    if (this.providers.has(url)) {
      const provider = this.providers.get(url);
      if (provider && provider._network) {
        return provider;
      }
    }

    const provider = new ethers.JsonRpcProvider(url, undefined, {
      staticNetwork: true,
      batchMaxCount: 100,
      batchStallTime: 10,
      polling: true,
      pollingInterval: 4000
    });

    this.providers.set(url, provider);
    console.log(`✅ Created pooled blockchain provider for ${url}`);
    
    return provider;
  }

  getContract(address, abi, rpcUrl = null) {
    const provider = this.getProvider(rpcUrl);
    return new ethers.Contract(address, abi, provider);
  }

  getSigner(privateKey, rpcUrl = null) {
    const provider = this.getProvider(rpcUrl);
    return new ethers.Wallet(privateKey, provider);
  }

  async healthCheck(rpcUrl = null) {
    try {
      const provider = this.getProvider(rpcUrl);
      const blockNumber = await provider.getBlockNumber();
      console.log(`✅ Provider health check passed. Block: ${blockNumber}`);
      return true;
    } catch (error) {
      console.error('❌ Provider health check failed:', error.message);
      return false;
    }
  }

  clearProvider(rpcUrl) {
    if (this.providers.has(rpcUrl)) {
      const provider = this.providers.get(rpcUrl);
      provider.destroy();
      this.providers.delete(rpcUrl);
      console.log(`🗑️ Cleared provider for ${rpcUrl}`);
    }
  }

  clearAll() {
    for (const [url, provider] of this.providers.entries()) {
      try {
        provider.destroy();
      } catch (error) {
        console.error(`Error destroying provider for ${url}:`, error.message);
      }
    }
    this.providers.clear();
    console.log('🗑️ Cleared all blockchain providers');
  }

  getStats() {
    return {
      activeProviders: this.providers.size,
      providers: Array.from(this.providers.keys())
    };
  }
}

const redisPool = new RedisPool();
const blockchainPool = new BlockchainProviderPool();

async function initializePools() {
  console.log('🚀 Initializing connection pools...');
  
  await redisPool.connect();
  
  await blockchainPool.healthCheck();
  
  console.log('✅ Connection pools initialized');
  console.log(`📊 HTTP Agent: ${httpAgent.maxSockets} max sockets, ${httpAgent.maxFreeSockets} max free`);
  console.log(`📊 Redis: ${redisPool.isConnected() ? 'Connected' : 'Disconnected'}`);
  console.log(`📊 Blockchain Providers: ${blockchainPool.getStats().activeProviders} active`);
}

function getPoolStats() {
  return {
    http: {
      maxSockets: httpAgent.maxSockets,
      maxFreeSockets: httpAgent.maxFreeSockets,
      sockets: httpAgent.sockets,
      freeSockets: httpAgent.freeSockets
    },
    https: {
      maxSockets: httpsAgent.maxSockets,
      maxFreeSockets: httpsAgent.maxFreeSockets,
      sockets: httpsAgent.sockets,
      freeSockets: httpsAgent.freeSockets
    },
    redis: {
      connected: redisPool.isConnected()
    },
    blockchain: blockchainPool.getStats()
  };
}

async function closeAllPools() {
  console.log('🛑 Closing all connection pools...');
  
  httpAgent.destroy();
  httpsAgent.destroy();
  
  await redisPool.disconnect();
  
  blockchainPool.clearAll();
  
  console.log('✅ All connection pools closed');
}

export {
  pooledAxios,
  httpAgent,
  httpsAgent,
  redisPool,
  blockchainPool,
  initializePools,
  getPoolStats,
  closeAllPools
};
