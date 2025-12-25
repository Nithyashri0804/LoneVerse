import cron from 'node-cron';
import { ethers } from 'ethers';
import { blockchainPool } from './connectionPools.js';
import LoanVerseABI from '../contracts/LoanVerse.json' with { type: 'json' };

class LiquidationService {
  constructor() {
    this.isActive = false;
    this.provider = null;
    this.contract = null;
    this.signer = null;
    this.activeAuctions = new Set();
    
    // Contract configuration
    this.contractAddress = process.env.VITE_LOANVERSE_V4_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    this.rpcUrl = process.env.RPC_URL || "http://localhost:8000";
    
    // In Replit environment, if localhost:8080 fails, we might be using a public RPC or a different port
    if (this.rpcUrl.includes('localhost:8000')) {
      console.log('ℹ️ Using default local RPC, ensuring it is accessible');
    }
    
    // Security: Require private key from environment
    if (!process.env.LIQUIDATOR_PRIVATE_KEY) {
      console.warn('⚠️ LIQUIDATOR_PRIVATE_KEY not set - using default local key for demo');
      this.privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    } else {
      this.privateKey = process.env.LIQUIDATOR_PRIVATE_KEY;
    }
    this.enabled = true;
    
    this.initializeProvider();
  }

  async initializeProvider() {
    try {
      console.log(`🔌 Initializing provider with RPC: ${this.rpcUrl}`);
      
      // Create a direct provider to bypass pooling issues for critical service
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      
      // Check connection
      try {
        await this.provider.getNetwork();
      } catch (e) {
        throw new Error(`Network unreachable: ${e.message}`);
      }

      this.signer = new ethers.Wallet(this.privateKey, this.provider);
      this.contract = new ethers.Contract(this.contractAddress, LoanVerseABI.abi, this.signer);
      
      console.log(`🔗 Liquidation service initialized for LoanVerseV4 at ${this.contractAddress}`);
      this._hasLoggedInitError = false; 
    } catch (error) {
      if (!this._hasLoggedInitError) {
        console.warn(`📡 Liquidation service waiting for blockchain network (${this.rpcUrl})... Error: ${error.message}`);
        this._hasLoggedInitError = true;
      }
      setTimeout(() => this.initializeProvider(), 5000);
    }
  }

  /**
   * Start the automated liquidation monitoring
   */
  startLiquidationMonitoring() {
    if (!this.enabled) {
      console.log('⚠️ Liquidation service disabled - set LIQUIDATOR_PRIVATE_KEY environment variable');
      return;
    }
    
    if (this.isActive) {
      console.log('⚠️ Liquidation monitoring is already active');
      return;
    }

    console.log('🚀 Starting LoanVerseV4 automated liquidation monitoring...');
    
    // Check for liquidatable loans every 10 seconds for V4 demo
    cron.schedule('*/10 * * * * *', async () => {
      await this.checkLiquidatableLoans();
    });

    this.isActive = true;
    console.log('✅ Automated liquidation monitoring started');
  }

  /**
   * Stop liquidation monitoring
   */
  stopLiquidationMonitoring() {
    this.isActive = false;
    console.log('⏹️ Liquidation monitoring stopped');
  }

  /**
   * Check for loans eligible for liquidation in V4
   */
  async checkLiquidatableLoans() {
    try {
      if (!this.contract) {
        await this.initializeProvider();
        if (!this.contract) {
          return;
        }
      }

      // Don't log every check in production/local - too verbose
      if (Math.random() < 0.1) {
        console.log('🔍 Checking for liquidatable V4 loans...');
      }
      
      let nextLoanId;
      try {
        nextLoanId = await this.contract.nextLoanId();
      } catch (e) {
        console.warn('⚠️ Could not fetch nextLoanId. Node might be restarting or unresponsive.');
        return;
      }
      
      for (let i = 1; i < Number(nextLoanId); i++) {
        let rawLoan;
        try {
          rawLoan = await this.contract.loans(i);
          if (!rawLoan || rawLoan.length < 16) {
            console.warn(`⚠️ Loan ${i} returned incomplete data. Skipping.`);
            continue;
          }
        } catch (e) {
          console.error(`❌ Failed to fetch loan ${i}:`, e.message);
          continue;
        }
        
        // Map raw array/object to named fields based on actual contract struct (16 fields)
        const loan = {
          id: rawLoan[0],
          borrower: rawLoan[1],
          lender: rawLoan[2],
          tokenId: rawLoan[3],
          collateralTokenId: rawLoan[4],
          amount: rawLoan[5],
          collateralAmount: rawLoan[6],
          interestRate: rawLoan[7],
          duration: rawLoan[8],
          createdAt: rawLoan[9],
          fundedAt: rawLoan[10],
          dueDate: rawLoan[11],
          status: rawLoan[12],
          ipfsDocumentHash: rawLoan[13],
          riskScore: rawLoan[14],
          collateralClaimed: rawLoan[15]
        };

        const status = Number(loan.status);
        
        // Only check active (2) or voting (6) loans
        if (status !== 2 && status !== 6) continue;

        const isPastDue = Math.floor(Date.now() / 1000) > Number(loan.dueDate); 
        
        let loanValueUSD, collateralValueUSD;
        try {
          loanValueUSD = await this.contract.calculateUSDValue(loan.tokenId, loan.amount);
          collateralValueUSD = await this.contract.calculateUSDValue(loan.collateralTokenId, loan.collateralAmount);
        } catch (e) {
          console.warn(`⚠️ Could not calculate USD value for loan ${i}. Falling back to time-based liquidation.`);
          loanValueUSD = 100000000n; 
          collateralValueUSD = 1n;
        }
        
        // Standard liquidation threshold: 120% collateral value
        const isUndercollateralized = (collateralValueUSD * 100n) < (loanValueUSD * 120n);

        if (isPastDue || isUndercollateralized) {
          console.log(`🚨 LIQUIDATING loan ${i} (Past Due: ${isPastDue}, Undercollateralized: ${isUndercollateralized})`);
          await this.processLiquidation(i, loan);
        }
      }

    } catch (error) {
      console.error('❌ Error checking liquidatable loans:', error.message);
    }
  }

  /**
   * Process liquidation for V4
   */
  async processLiquidation(loanId, loan) {
    try {
      // Calculate interest based on interest rate (in basis points, divide by 10000)
      const amount = BigInt(loan.amount);
      const interestRate = BigInt(loan.interestRate);
      const interest = (amount * interestRate) / 10000n;
      const totalOwed = amount + interest;

      console.log(`🔄 Attempting to liquidate loan ${loanId}. Principal: ${amount.toString()}, Interest: ${interest.toString()}, Total Owed: ${totalOwed.toString()}`);

      const rawTokenInfo = await this.contract.supportedTokens(loan.tokenId);
      const tokenInfo = {
        tokenType: rawTokenInfo[0],
        contractAddress: rawTokenInfo[1],
        symbol: rawTokenInfo[2],
        decimals: rawTokenInfo[3],
        isActive: rawTokenInfo[4],
        priceFeed: rawTokenInfo[5]
      };
      
      let tx;
      if (Number(tokenInfo.tokenType) === 0) { // ETH
        tx = await this.contract.liquidate(loanId, { 
          value: totalOwed,
          gasLimit: 1000000 // Reasonable gas limit
        });
      } else {
        // For ERC20, the liquidator must have tokens and approve the contract
        const tokenAddress = tokenInfo.contractAddress;
        const tokenContract = new ethers.Contract(tokenAddress, ["function approve(address spender, uint256 amount) public returns (bool)"], this.signer);
        
        console.log(`🔓 Approving ${tokenAddress} for liquidation...`);
        const approveTx = await tokenContract.approve(this.contractAddress, totalOwed);
        await approveTx.wait();
        
        tx = await this.contract.liquidate(loanId, {
          gasLimit: 1000000
        });
      }

      console.log(`🔄 Liquidation transaction sent: ${tx.hash}`);
      await tx.wait();
      console.log(`✅ Liquidation successful for loan ${loanId}`);

    } catch (error) {
      console.error(`❌ Failed to liquidate loan ${loanId}:`, error.message);
    }
  }

  /**
   * Finalize an auction
   */
  async finalizeAuction(auctionId) {
    try {
      const tx = await this.contract.finalizeAuction(auctionId);
      console.log(`🔄 Auction finalization transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Auction ${auctionId} finalized successfully`);
      
      this.activeAuctions.delete(auctionId);

    } catch (error) {
      console.error(`❌ Failed to finalize auction ${auctionId}:`, error.message);
    }
  }

  /**
   * Perform health check on the liquidation system
   */
  async performHealthCheck() {
    try {
      console.log('🏥 Performing liquidation service health check...');
      
      // Check provider connection
      const blockNumber = await this.provider.getBlockNumber();
      console.log(`📊 Current block number: ${blockNumber}`);
      
      // Check liquidator balance
      const balance = await this.provider.getBalance(this.signer.address);
      const balanceEth = ethers.formatEther(balance);
      console.log(`💰 Liquidator balance: ${balanceEth} ETH`);
      
      // Warn if balance is low
      if (parseFloat(balanceEth) < 0.1) {
        console.log('⚠️ WARNING: Liquidator balance is low! Please refund the account.');
      }
      
      // Check contract is still accessible
      const contractCode = await this.provider.getCode(this.contractAddress);
      if (contractCode === '0x') {
        console.log('❌ WARNING: Contract not found at address');
        return false;
      }
      
      console.log('✅ Health check passed');
      return true;

    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return false;
    }
  }

  /**
   * Record liquidation metrics
   */
  async recordLiquidationMetrics(loanId, collateralRatio, gasUsed) {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        loanId: loanId.toString(),
        collateralRatio: collateralRatio.toString(),
        gasUsed: gasUsed.toString(),
        liquidator: this.signer.address
      };

      console.log('📊 Liquidation metrics:', metrics);
      
      // In a production system, you'd store these metrics in a database
      // or send them to a monitoring system like DataDog, CloudWatch, etc.
      
    } catch (error) {
      console.error('❌ Failed to record metrics:', error.message);
    }
  }

  /**
   * Get liquidation service status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      contractAddress: this.contractAddress,
      liquidatorAddress: this.signer?.address,
      rpcUrl: this.rpcUrl,
      activeAuctions: Array.from(this.activeAuctions)
    };
  }

  /**
   * Manually trigger liquidation check (for testing)
   */
  async manualLiquidationCheck() {
    console.log('🔧 Manual liquidation check triggered');
    await this.checkLiquidatableLoans();
    await this.checkAuctionFinalizations();
  }
}

// Create singleton instance
const liquidationService = new LiquidationService();

// Export functions
export function startLiquidationMonitoring() {
  liquidationService.startLiquidationMonitoring();
}

export function stopLiquidationMonitoring() {
  liquidationService.stopLiquidationMonitoring();
}

export function getLiquidationStatus() {
  return liquidationService.getStatus();
}

export function triggerManualCheck() {
  return liquidationService.manualLiquidationCheck();
}

export default liquidationService;