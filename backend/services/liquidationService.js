import cron from 'node-cron';
import { ethers } from 'ethers';
import { blockchainPool } from './connectionPools.js';

// Contract ABI for LoanVerseV4 (including the new liquidate function)
const LOANVERSE_V4_ABI = [
  "function liquidate(uint256 _loanId) external payable",
  "function loans(uint256) external view returns (tuple(uint256 id, address borrower, uint256 tokenId, uint256 collateralTokenId, uint256 amount, uint256 amountFunded, uint256 collateralAmount, uint256 interestRate, uint256 duration, uint256 minContribution, uint256 fundingDeadline, uint256 createdAt, uint256 fundedAt, uint256 dueDate, uint8 status, string ipfsDocumentHash, uint256 riskScore, uint256 liquidationThreshold, uint256 totalRepaid, uint256 earlyRepaymentPenalty))",
  "function supportedTokens(uint256) external view returns (tuple(uint8 tokenType, address contractAddress, string symbol, uint8 decimals, bool isActive, address priceFeed))",
  "function calculateUSDValue(uint256 _tokenId, uint256 _amount) public view returns (uint256)",
  "function nextLoanId() external view returns (uint256)"
];

class LiquidationService {
  constructor() {
    this.isActive = false;
    this.provider = null;
    this.contract = null;
    this.signer = null;
    this.activeAuctions = new Set();
    
    // Contract configuration
    this.contractAddress = process.env.VITE_LOANVERSE_V4_ADDRESS || process.env.LOANVERSE_V3_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    this.rpcUrl = process.env.RPC_URL || "http://localhost:8545";
    
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
      this.contract = new ethers.Contract(this.contractAddress, LOANVERSE_V4_ABI, this.signer);
      
      console.log('🔗 Liquidation service initialized for LoanVerseV4');
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

    console.log('🚀 Starting LoanVerseV4 automated liquidation monitoring...');
    
    // Check for liquidatable loans every 1 minute for V4
    cron.schedule('*/1 * * * *', async () => {
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
        console.log('⚠️ Contract not initialized');
        return;
      }

      console.log('🔍 Checking for liquidatable V4 loans...');
      
      const nextLoanId = await this.contract.nextLoanId();
      
      for (let i = 1; i < Number(nextLoanId); i++) {
        const loan = await this.contract.loans(i);
        const status = Number(loan.status);
        
        // Only check active (2) or voting (6) loans
        if (status !== 2 && status !== 6) continue;

        const isPastDue = Math.floor(Date.now() / 1000) > Number(loan.dueDate) + (2 * 60);
        
        const loanValueUSD = await this.contract.calculateUSDValue(loan.tokenId, loan.amount);
        const collateralValueUSD = await this.contract.calculateUSDValue(loan.collateralTokenId, loan.collateralAmount);
        const isUndercollateralized = (collateralValueUSD * 100n) < (loanValueUSD * loan.liquidationThreshold);

        if (isPastDue || isUndercollateralized) {
          console.log(`🚨 Found liquidatable loan ${i} (Past Due: ${isPastDue}, Undercollateralized: ${isUndercollateralized})`);
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
      const interest = (loan.amount * loan.interestRate) / 10000n;
      const totalOwed = loan.amount + interest - loan.totalRepaid;

      const tokenInfo = await this.contract.supportedTokens(loan.tokenId);
      
      let tx;
      if (tokenInfo.tokenType === 0) { // ETH
        tx = await this.contract.liquidate(loanId, { value: totalOwed });
      } else {
        // Handle ERC20 approval if needed (simplification: assume liquidator has approved or uses ETH)
        // In a real bot, we'd check allowance and balance here
        tx = await this.contract.liquidate(loanId);
      }

      console.log(`🔄 Liquidation transaction sent for loan ${loanId}: ${tx.hash}`);
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