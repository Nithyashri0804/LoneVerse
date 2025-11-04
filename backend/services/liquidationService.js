import cron from 'node-cron';
import { ethers } from 'ethers';
import { blockchainPool } from './connectionPools.js';

// Contract ABI for LoanVerseV3 (simplified for key functions)
const LOANVERSE_V3_ABI = [
  "function getLoansEligibleForLiquidation() external view returns (uint256[] memory)",
  "function liquidateLoan(uint256 _loanId) external",
  "function isLoanUnderwater(uint256 _loanId) external view returns (bool, uint256)",
  "function finalizeAuction(uint256 _auctionId) external",
  "function loans(uint256) external view returns (tuple(uint256 id, address borrower, address lender, uint256 tokenId, uint256 collateralTokenId, uint256 amount, uint256 collateralAmount, uint256 interestRate, uint256 duration, uint256 createdAt, uint256 fundedAt, uint256 dueDate, uint8 status, string ipfsDocumentHash, uint256 riskScore, bool collateralClaimed, uint256 liquidationThreshold, uint256 lastHealthCheck))",
  "function liquidationAuctions(uint256) external view returns (tuple(uint256 loanId, uint256 startTime, uint256 endTime, uint256 startingPrice, uint256 reservePrice, address highestBidder, uint256 highestBid, bool active))",
  "event LiquidationTriggered(uint256 indexed loanId, uint256 currentRatio, uint256 threshold)",
  "event AuctionStarted(uint256 indexed auctionId, uint256 indexed loanId, uint256 startingPrice, uint256 endTime)",
  "event AuctionFinalized(uint256 indexed auctionId, address indexed winner, uint256 finalPrice)"
];

class LiquidationService {
  constructor() {
    this.isActive = false;
    this.provider = null;
    this.contract = null;
    this.signer = null;
    this.activeAuctions = new Set();
    
    // Contract configuration
    this.contractAddress = process.env.LOANVERSE_V3_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    this.rpcUrl = process.env.RPC_URL || "http://localhost:8000";
    
    // Security: Require private key from environment
    if (!process.env.LIQUIDATOR_PRIVATE_KEY) {
      console.warn('⚠️ LIQUIDATOR_PRIVATE_KEY not set - liquidation service disabled for security');
      this.enabled = false;
      return;
    }
    this.privateKey = process.env.LIQUIDATOR_PRIVATE_KEY;
    this.enabled = true;
    
    this.initializeProvider();
  }

  initializeProvider() {
    try {
      // Use pooled provider and signer
      this.provider = blockchainPool.getProvider(this.rpcUrl);
      this.signer = blockchainPool.getSigner(this.privateKey, this.rpcUrl);
      this.contract = new ethers.Contract(this.contractAddress, LOANVERSE_V3_ABI, this.signer);
      
      console.log('🔗 Liquidation service initialized with pooled provider');
      console.log('📍 Contract:', this.contractAddress);
      console.log('🔑 Liquidator account:', this.signer.address);
    } catch (error) {
      console.error('❌ Failed to initialize liquidation service:', error);
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

    console.log('🚀 Starting automated liquidation monitoring...');
    
    // Check for liquidatable loans every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.checkLiquidatableLoans();
    });

    // Check for auction finalizations every 10 minutes
    cron.schedule('*/10 * * * *', async () => {
      await this.checkAuctionFinalizations();
    });

    // Health check every hour
    cron.schedule('0 * * * *', async () => {
      await this.performHealthCheck();
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
   * Check for loans eligible for liquidation
   */
  async checkLiquidatableLoans() {
    try {
      if (!this.contract) {
        console.log('⚠️ Contract not initialized');
        return;
      }

      console.log('🔍 Checking for liquidatable loans...');
      
      // Get all loans eligible for liquidation
      const eligibleLoanIds = await this.contract.getLoansEligibleForLiquidation();
      
      if (eligibleLoanIds.length === 0) {
        console.log('✅ No loans eligible for liquidation');
        return;
      }

      console.log(`⚠️ Found ${eligibleLoanIds.length} loans eligible for liquidation`);

      // Process each eligible loan
      for (const loanId of eligibleLoanIds) {
        await this.processLiquidation(loanId);
      }

    } catch (error) {
      console.error('❌ Error checking liquidatable loans:', error.message);
    }
  }

  /**
   * Process liquidation for a specific loan
   */
  async processLiquidation(loanId) {
    try {
      // Get loan details
      const loan = await this.contract.loans(loanId);
      
      // Check if loan is actually underwater
      const [isUnderwater, currentRatio] = await this.contract.isLoanUnderwater(loanId);
      
      if (!isUnderwater) {
        console.log(`ℹ️ Loan ${loanId} is no longer underwater (ratio: ${currentRatio}%)`);
        return;
      }

      console.log(`🚨 Liquidating loan ${loanId} - Current ratio: ${currentRatio}%, Threshold: ${loan.liquidationThreshold}%`);

      // Check if we have enough gas and get proper fee data
      const gasEstimate = await this.contract.liquidateLoan.estimateGas(loanId);
      const feeData = await this.provider.getFeeData();
      
      // Handle EIP-1559 vs legacy transactions
      let gasConfig = {};
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        gasConfig = {
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
        };
      } else if (feeData.gasPrice) {
        gasConfig = { gasPrice: feeData.gasPrice };
      } else {
        throw new Error('Unable to determine gas pricing');
      }
      
      console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);

      // Execute liquidation with proper gas configuration
      const tx = await this.contract.liquidateLoan(loanId, {
        gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
        ...gasConfig
      });

      console.log(`🔄 Liquidation transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Liquidation successful for loan ${loanId} - Gas used: ${receipt.gasUsed.toString()}`);

      // Track metrics
      await this.recordLiquidationMetrics(loanId, currentRatio, receipt.gasUsed);

    } catch (error) {
      console.error(`❌ Failed to liquidate loan ${loanId}:`, error.message);
      
      // Log detailed error for debugging
      if (error.reason) {
        console.error(`Reason: ${error.reason}`);
      }
    }
  }

  /**
   * Check for auctions that need finalization
   */
  async checkAuctionFinalizations() {
    try {
      console.log('🔍 Checking for auctions ready for finalization...');
      
      // This is a simplified check - in a full implementation, you'd maintain
      // a database of active auctions or query events
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Check recent auctions (last 100 for example)
      for (let auctionId = 1; auctionId <= 100; auctionId++) {
        try {
          const auction = await this.contract.liquidationAuctions(auctionId);
          
          // Skip inactive auctions or already finalized
          if (!auction.active) continue;
          
          // Check if auction has ended
          if (currentTime > Number(auction.endTime)) {
            console.log(`⏰ Finalizing expired auction ${auctionId}`);
            await this.finalizeAuction(auctionId);
          }
        } catch (error) {
          // Auction doesn't exist, skip
          continue;
        }
      }

    } catch (error) {
      console.error('❌ Error checking auction finalizations:', error.message);
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