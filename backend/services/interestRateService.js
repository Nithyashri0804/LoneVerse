import { ethers } from 'ethers';

/**
 * Dynamic Interest Rate Matching Service
 * Implements algorithmic matching between borrowers and lenders
 */
class InterestRateService {
  constructor() {
    this.loanRequests = new Map(); // Active loan requests
    this.lendingOffers = new Map(); // Active lending offers
    this.matchedDeals = [];
    
    this.provider = new ethers.JsonRpcProvider("http://localhost:8000");
    this.contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    
    console.log('📈 Interest Rate Matching Service initialized');
  }

  /**
   * Calculate optimal interest rate based on supply/demand
   */
  calculateOptimalRate(tokenType, amount, duration, riskScore) {
    // Base rate calculation factors
    const baseRate = 300; // 3% base rate in basis points
    const riskPremium = (riskScore / 1000) * 1500; // Up to 15% risk premium
    const durationPremium = Math.min(duration / (365 * 24 * 3600) * 200, 400); // Up to 4% duration premium
    
    // Market dynamics
    const supplyDemandRatio = this.calculateSupplyDemandRatio(tokenType);
    const marketPremium = this.calculateMarketPremium(supplyDemandRatio);
    
    // Size premium for large loans
    const sizePremium = amount > ethers.parseEther("10") ? 100 : 0; // 1% for loans > 10 ETH
    
    const optimalRate = Math.round(
      baseRate + riskPremium + durationPremium + marketPremium + sizePremium
    );
    
    return Math.min(optimalRate, 3000); // Cap at 30%
  }

  /**
   * Calculate supply/demand ratio for a token type
   */
  calculateSupplyDemandRatio(tokenType) {
    const totalSupply = this.getTotalLendingSupply(tokenType);
    const totalDemand = this.getTotalBorrowingDemand(tokenType);
    
    if (totalDemand === 0) return 1; // No demand, rates should be low
    return totalSupply / totalDemand;
  }

  /**
   * Get total lending supply for token type
   */
  getTotalLendingSupply(tokenType) {
    let total = 0;
    for (const [, offer] of this.lendingOffers) {
      if (offer.tokenType === tokenType) {
        total += parseFloat(ethers.formatEther(offer.amount));
      }
    }
    return total;
  }

  /**
   * Get total borrowing demand for token type
   */
  getTotalBorrowingDemand(tokenType) {
    let total = 0;
    for (const [, request] of this.loanRequests) {
      if (request.tokenType === tokenType) {
        total += parseFloat(ethers.formatEther(request.amount));
      }
    }
    return total;
  }

  /**
   * Calculate market premium based on supply/demand
   */
  calculateMarketPremium(supplyDemandRatio) {
    if (supplyDemandRatio >= 1.5) {
      // High supply, low demand - negative premium (lower rates)
      return -200; // -2%
    } else if (supplyDemandRatio >= 1.0) {
      // Balanced market
      return 0;
    } else if (supplyDemandRatio >= 0.5) {
      // High demand, moderate supply - positive premium
      return 300; // +3%
    } else {
      // Very high demand, low supply - high premium
      return 800; // +8%
    }
  }

  /**
   * Find optimal matches between borrowers and lenders
   */
  findOptimalMatches() {
    const matches = [];
    
    // Sort loan requests by risk score (low risk first for better matching)
    const sortedRequests = Array.from(this.loanRequests.values())
      .sort((a, b) => a.riskScore - b.riskScore);
    
    // Sort lending offers by interest rate (high rate first for better yields)
    const sortedOffers = Array.from(this.lendingOffers.values())
      .sort((a, b) => b.maxInterestRate - a.maxInterestRate);
    
    for (const request of sortedRequests) {
      for (const offer of sortedOffers) {
        const match = this.evaluateMatch(request, offer);
        if (match.isMatch) {
          matches.push(match);
          break; // Move to next request
        }
      }
    }
    
    return matches;
  }

  /**
   * Evaluate if a loan request matches a lending offer
   */
  evaluateMatch(loanRequest, lendingOffer) {
    const compatibility = {
      isMatch: false,
      confidence: 0,
      suggestedRate: 0,
      savings: 0,
      loanRequest,
      lendingOffer
    };
    
    // Check basic compatibility
    if (loanRequest.tokenType !== lendingOffer.tokenType) {
      return compatibility;
    }
    
    if (loanRequest.amount > lendingOffer.amount) {
      return compatibility;
    }
    
    if (loanRequest.duration < lendingOffer.minDuration || 
        loanRequest.duration > lendingOffer.maxDuration) {
      return compatibility;
    }
    
    // Calculate optimal rate for this match
    const optimalRate = this.calculateOptimalRate(
      loanRequest.tokenType,
      loanRequest.amount,
      loanRequest.duration,
      loanRequest.riskScore
    );
    
    // Check if both parties can agree on the rate
    const rateAcceptable = optimalRate >= lendingOffer.minInterestRate &&
                          optimalRate <= loanRequest.maxInterestRate;
    
    if (!rateAcceptable) {
      return compatibility;
    }
    
    // Calculate confidence based on rate optimization
    const borrowerSavings = loanRequest.maxInterestRate - optimalRate;
    const lenderGains = optimalRate - lendingOffer.minInterestRate;
    const totalBenefit = borrowerSavings + lenderGains;
    
    compatibility.isMatch = true;
    compatibility.confidence = Math.min(totalBenefit / 100, 100); // Normalize to 0-100
    compatibility.suggestedRate = optimalRate;
    compatibility.savings = borrowerSavings;
    
    return compatibility;
  }

  /**
   * Add a new loan request to the matching pool
   */
  addLoanRequest(loanId, borrower, tokenType, amount, maxInterestRate, duration, riskScore) {
    const request = {
      loanId,
      borrower,
      tokenType,
      amount,
      maxInterestRate,
      duration,
      riskScore,
      timestamp: Date.now()
    };
    
    this.loanRequests.set(loanId, request);
    console.log(`📋 Added loan request ${loanId} to matching pool`);
    
    // Try to find matches immediately
    this.processMatching();
  }

  /**
   * Add a new lending offer to the matching pool
   */
  addLendingOffer(offerId, lender, tokenType, amount, minInterestRate, maxInterestRate, minDuration, maxDuration) {
    const offer = {
      offerId,
      lender,
      tokenType,
      amount,
      minInterestRate,
      maxInterestRate,
      minDuration,
      maxDuration,
      timestamp: Date.now()
    };
    
    this.lendingOffers.set(offerId, offer);
    console.log(`💰 Added lending offer ${offerId} to matching pool`);
    
    // Try to find matches immediately
    this.processMatching();
  }

  /**
   * Process matching algorithm
   */
  processMatching() {
    try {
      const matches = this.findOptimalMatches();
      
      if (matches.length > 0) {
        console.log(`🎯 Found ${matches.length} optimal matches`);
        
        for (const match of matches) {
          this.executeMatch(match);
        }
      }
    } catch (error) {
      console.error('❌ Error in matching process:', error);
    }
  }

  /**
   * Execute a match by notifying both parties
   */
  executeMatch(match) {
    console.log(`✅ Executing match: Loan ${match.loanRequest.loanId} with Offer ${match.lendingOffer.offerId}`);
    console.log(`💡 Suggested rate: ${match.suggestedRate} bps (${match.suggestedRate/100}%)`);
    console.log(`💸 Borrower saves: ${match.savings} bps, Confidence: ${match.confidence.toFixed(1)}%`);
    
    // Store the match
    this.matchedDeals.push({
      ...match,
      executedAt: Date.now()
    });
    
    // In a real implementation, you would:
    // 1. Send notifications to both parties
    // 2. Create a binding agreement
    // 3. Execute the smart contract transaction
    // 4. Remove the matched items from the pools
    
    // For now, just remove from active pools
    this.loanRequests.delete(match.loanRequest.loanId);
    this.lendingOffers.delete(match.lendingOffer.offerId);
  }

  /**
   * Remove expired loan requests and offers
   */
  cleanupExpiredItems() {
    const now = Date.now();
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours
    
    // Cleanup loan requests
    for (const [id, request] of this.loanRequests) {
      if (now - request.timestamp > expirationTime) {
        this.loanRequests.delete(id);
        console.log(`🧹 Removed expired loan request ${id}`);
      }
    }
    
    // Cleanup lending offers
    for (const [id, offer] of this.lendingOffers) {
      if (now - offer.timestamp > expirationTime) {
        this.lendingOffers.delete(id);
        console.log(`🧹 Removed expired lending offer ${id}`);
      }
    }
  }

  /**
   * Get current market statistics
   */
  getMarketStats() {
    const stats = {
      activeRequests: this.loanRequests.size,
      activeOffers: this.lendingOffers.size,
      totalMatches: this.matchedDeals.length,
      supplyByToken: {},
      demandByToken: {},
      averageRates: {}
    };
    
    // Calculate supply and demand by token type
    const tokenTypes = ['ETH', 'USDC', 'DAI', 'USDT'];
    for (const tokenType of tokenTypes) {
      stats.supplyByToken[tokenType] = this.getTotalLendingSupply(tokenType);
      stats.demandByToken[tokenType] = this.getTotalBorrowingDemand(tokenType);
      
      // Calculate average rate for this token
      const recentMatches = this.matchedDeals
        .filter(match => match.loanRequest.tokenType === tokenType)
        .slice(-10); // Last 10 matches
      
      if (recentMatches.length > 0) {
        const avgRate = recentMatches.reduce((sum, match) => sum + match.suggestedRate, 0) / recentMatches.length;
        stats.averageRates[tokenType] = Math.round(avgRate);
      } else {
        stats.averageRates[tokenType] = this.calculateOptimalRate(tokenType, ethers.parseEther("1"), 30 * 24 * 3600, 500);
      }
    }
    
    return stats;
  }

  /**
   * Get recommendations for a borrower
   */
  getBorrowerRecommendations(tokenType, amount, maxRate, duration, riskScore) {
    const optimalRate = this.calculateOptimalRate(tokenType, amount, duration, riskScore);
    const marketRate = this.getMarketStats().averageRates[tokenType] || optimalRate;
    
    return {
      optimalRate,
      marketRate,
      savings: Math.max(0, maxRate - optimalRate),
      recommendation: optimalRate < maxRate ? 
        'You can likely get a better rate than your maximum' :
        'Consider improving collateral ratio or reducing loan amount',
      waitTime: this.estimateMatchingTime(tokenType, amount, maxRate)
    };
  }

  /**
   * Estimate how long it might take to find a match
   */
  estimateMatchingTime(tokenType, amount, maxRate) {
    const availableOffers = Array.from(this.lendingOffers.values())
      .filter(offer => 
        offer.tokenType === tokenType && 
        offer.amount >= amount && 
        offer.minInterestRate <= maxRate
      ).length;
    
    if (availableOffers >= 3) return 'Less than 1 hour';
    if (availableOffers >= 1) return '1-4 hours';
    return '4-24 hours';
  }
}

// Create singleton instance
const interestRateService = new InterestRateService();

export default interestRateService;

// Auto-cleanup every hour
setInterval(() => {
  interestRateService.cleanupExpiredItems();
}, 60 * 60 * 1000);