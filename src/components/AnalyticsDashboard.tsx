import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Users, Target, BarChart3, PieChart, Calendar, Calculator, Activity, Award } from 'lucide-react';
import { formatEther } from 'ethers';
import { BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, Area, AreaChart, ComposedChart } from 'recharts';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { Loan, LoanStatus } from '../types/loan';

interface AnalyticsData {
  totalVolume: number;
  totalLoans: number;
  activeLoans: number;
  repaidLoans: number;
  defaultedLoans: number;
  averageInterestRate: number;
  averageLoanAmount: number;
  averageDuration: number;
  monthlyVolume: { month: string; volume: number; loans: number }[];
  riskDistribution: { risk: string; count: number; percentage: number }[];
  performanceMetrics: {
    successRate: number;
    averageRepaymentTime: number;
    platformFees: number;
    roi: number;
  };
  portfolioTrends: { date: string; portfolio: number; earnings: number; roi: number }[];
  riskVsReturn: { risk: number; expectedReturn: number; actualReturn: number }[];
  performanceComparison: { category: string; userValue: number; platformAverage: number }[];
}

const AnalyticsDashboard: React.FC = () => {
  const { contract } = useContract();
  const { account } = useWallet();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [userEarnings, setUserEarnings] = useState({
    totalEarned: 0,
    projectedMonthly: 0,
    activeInvestments: 0,
    projectedAnnual: 0,
    riskAdjustedReturn: 0
  });

  const loadAnalytics = async () => {
    if (!contract) return;

    try {
      setIsLoading(true);

      // Get all loan IDs
      const activeLoanIds = await contract.getActiveLoanRequests();

      // For demo, we'll use active loans + user's loans
      const borrowerLoanIds = account ? await contract.getBorrowerLoans(account) : [];
      const lenderLoanIds = account ? await contract.getLenderLoans(account) : [];
      
      const combinedLoanIds = new Set([
        ...activeLoanIds.map((id: any) => Number(id.toString())),
        ...borrowerLoanIds.map((id: any) => Number(id.toString())),
        ...lenderLoanIds.map((id: any) => Number(id.toString()))
      ]);

      // Fetch all loan details
      const loanPromises = Array.from(combinedLoanIds).map(async (loanId) => {
        const loanData = await contract.getLoan(loanId);
        return {
          id: Number(loanData.id.toString()),
          borrower: loanData.borrower,
          lender: loanData.lenders.length > 0 ? loanData.lenders[0] : '',
          lenders: loanData.lenders,
          lenderAmounts: loanData.lenderAmounts.map((amt: any) => amt.toString()),
          amount: loanData.totalAmount.toString(),
          totalAmount: loanData.totalAmount.toString(),
          totalFunded: loanData.totalFunded.toString(),
          loanToken: loanData.loanToken,
          collateralToken: loanData.collateralToken,
          collateral: loanData.collateralAmount.toString(),
          collateralAmount: loanData.collateralAmount.toString(),
          interestRate: Number(loanData.interestRate.toString()),
          isVariableRate: loanData.isVariableRate,
          duration: Number(loanData.duration.toString()),
          createdAt: Number(loanData.createdAt.toString()),
          fundedAt: Number(loanData.fundedAt.toString()),
          dueDate: Number(loanData.dueDate.toString()),
          status: loanData.status as LoanStatus,
          collateralClaimed: loanData.collateralClaimed,
          riskScore: Number(loanData.riskScore.toString()),
          hasInsurance: loanData.hasInsurance,
          insuranceFee: loanData.insuranceFee.toString(),
        } as Loan;
      });

      const loans = await Promise.all(loanPromises);
      
      // Calculate analytics
      const totalVolume = loans.reduce((sum, loan) => sum + parseFloat(formatEther(loan.totalAmount)), 0);
      const totalLoans = loans.length;
      const activeLoans = loans.filter(l => l.status === LoanStatus.FUNDED).length;
      const repaidLoans = loans.filter(l => l.status === LoanStatus.REPAID).length;
      const defaultedLoans = loans.filter(l => l.status === LoanStatus.DEFAULTED).length;
      const averageInterestRate = loans.length > 0 ? 
        loans.reduce((sum, loan) => sum + toPercentNumber(loan.interestRate), 0) / loans.length : 0;
      const averageLoanAmount = totalVolume / (totalLoans || 1);
      const averageDuration = loans.length > 0 ?
        loans.reduce((sum, loan) => sum + loan.duration, 0) / loans.length / (24 * 60 * 60) : 0;

      // Generate analytics data with appropriate timeframe handling per metric
      const monthlyVolume = generateMonthlyData(loans, timeframe);
      const riskDistribution = calculateRiskDistribution(loans);
      const portfolioTrends = generatePortfolioTrends(loans, account, timeframe);
      const riskVsReturn = generateRiskVsReturnData(loans);
      const performanceComparison = generatePerformanceComparison(loans, account);
      
      // Performance metrics
      const successRate = totalLoans > 0 ? (repaidLoans / totalLoans) * 100 : 0;
      const averageRepaymentTime = calculateAverageRepaymentTime(loans);
      const platformFees = totalVolume * 0.005; // 0.5% platform fee
      const roi = calculateROI(loans);

      // Calculate user earnings
      if (account) {
        const userLenderLoans = loans.filter(l => 
          l.lender.toLowerCase() === account.toLowerCase() && l.status === LoanStatus.REPAID
        );
        const totalEarned = userLenderLoans.reduce((sum, loan) => {
          const principal = parseFloat(formatEther(loan.amount));
          const interest = principal * toFraction(loan.interestRate);
          return sum + interest;
        }, 0);

        const activeLenderLoans = loans.filter(l => 
          l.lender.toLowerCase() === account.toLowerCase() && l.status === LoanStatus.FUNDED
        );
        const projectedMonthly = activeLenderLoans.reduce((sum, loan) => {
          const principal = parseFloat(formatEther(loan.amount));
          const annualInterest = principal * toFraction(loan.interestRate);
          return sum + (annualInterest / 12);
        }, 0);

        const activeInvestments = activeLenderLoans.reduce((sum, loan) => 
          sum + parseFloat(formatEther(loan.amount)), 0
        );

        const projectedAnnual = projectedMonthly * 12;
        const riskAdjustedReturn = calculateRiskAdjustedReturn(activeLenderLoans);

        setUserEarnings({ totalEarned, projectedMonthly, activeInvestments, projectedAnnual, riskAdjustedReturn });
      }

      setAnalytics({
        totalVolume,
        totalLoans,
        activeLoans,
        repaidLoans,
        defaultedLoans,
        averageInterestRate,
        averageLoanAmount,
        averageDuration,
        monthlyVolume,
        riskDistribution,
        performanceMetrics: {
          successRate,
          averageRepaymentTime,
          platformFees,
          roi
        },
        portfolioTrends,
        riskVsReturn,
        performanceComparison
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMonthlyData = (loans: Loan[], timeframe: string) => {
    const now = new Date();
    const timeframeDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }[timeframe] || 30;
    
    const cutoffTime = now.getTime() / 1000 - (timeframeDays * 24 * 60 * 60);
    const recentLoans = loans.filter(loan => loan.createdAt >= cutoffTime);
    
    const volumeData = new Map<string, { volume: number; loans: number }>();
    
    // Generate proper buckets based on timeframe
    if (timeframe === '1y') {
      // 12 monthly buckets for 1 year
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        volumeData.set(monthKey, { volume: 0, loans: 0 });
      }
    } else {
      // Daily buckets for 7d/30d/90d
      const periods = timeframeDays;
      for (let i = periods - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
        const dayKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        volumeData.set(dayKey, { volume: 0, loans: 0 });
      }
    }
    
    // Aggregate loan data
    recentLoans.forEach(loan => {
      const loanDate = new Date(loan.createdAt * 1000);
      const bucketKey = timeframe === '1y' ?
        loanDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) :
        loanDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const existing = volumeData.get(bucketKey);
      if (existing) {
        existing.volume += parseFloat(formatEther(loan.amount));
        existing.loans += 1;
      }
    });
    
    return Array.from(volumeData.entries()).map(([period, data]) => ({
      month: period,
      volume: parseFloat(data.volume.toFixed(2)),
      loans: data.loans
    }));
  };

  const calculateRiskDistribution = (loans: Loan[]) => {
    const riskCounts = { Low: 0, Medium: 0, High: 0 };
    
    loans.forEach(loan => {
      const interestRate = toPercentNumber(loan.interestRate);
      if (interestRate < 10) riskCounts.Low++;
      else if (interestRate < 20) riskCounts.Medium++;
      else riskCounts.High++;
    });

    const total = loans.length || 1;
    return Object.entries(riskCounts).map(([risk, count]) => ({
      risk,
      count,
      percentage: Math.round((count / total) * 100)
    }));
  };

  const calculateAverageRepaymentTime = (loans: Loan[]) => {
    const repaidLoans = loans.filter(l => l.status === LoanStatus.REPAID && l.dueDate > 0);
    if (repaidLoans.length === 0) return 0;

    const totalDays = repaidLoans.reduce((sum, loan) => {
      const repaymentDays = (loan.dueDate - loan.fundedAt) / (24 * 60 * 60);
      return sum + repaymentDays;
    }, 0);

    return totalDays / repaidLoans.length;
  };

  const calculateROI = (loans: Loan[]) => {
    if (loans.length === 0) return 0;

    const totalFunded = loans.reduce((sum, loan) => 
      sum + parseFloat(formatEther(loan.amount)), 0
    );
    
    // Calculate realized PnL: interest from repaid loans minus principal lost to defaults
    const repaidInterest = loans
      .filter(l => l.status === LoanStatus.REPAID)
      .reduce((sum, loan) => {
        const principal = parseFloat(formatEther(loan.amount));
        const interest = principal * toFraction(loan.interestRate);
        return sum + interest;
      }, 0);
    
    const defaultedPrincipal = loans
      .filter(l => l.status === LoanStatus.DEFAULTED)
      .reduce((sum, loan) => sum + parseFloat(formatEther(loan.amount)), 0);
    
    const realizedPnL = repaidInterest - defaultedPrincipal;

    return totalFunded > 0 ? (realizedPnL / totalFunded) * 100 : 0;
  };


  const toPercentNumber = (rate: number) => rate / 100; // Convert basis points to percentage
  const toFraction = (rate: number) => rate / 10000; // Convert basis points to decimal fraction

  const generatePortfolioTrends = (loans: Loan[], userAccount: string | null, timeframe: string) => {
    if (!userAccount) return [];
    
    const userLenderLoans = loans.filter(l => l.lender.toLowerCase() === userAccount.toLowerCase());
    const now = new Date();
    const timeframeDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }[timeframe] || 30;
    
    const windowStart = now.getTime() / 1000 - (timeframeDays * 24 * 60 * 60);
    
    // Calculate initial outstanding portfolio at window start
    let initialPortfolio = 0;
    let initialEarnings = 0;
    
    userLenderLoans.forEach(loan => {
      const principal = parseFloat(formatEther(loan.amount));
      if (loan.fundedAt <= windowStart) {
        if (loan.status === LoanStatus.FUNDED || 
           (loan.status === LoanStatus.REPAID && loan.dueDate > windowStart) ||
           (loan.status === LoanStatus.DEFAULTED && loan.dueDate > windowStart)) {
          initialPortfolio += principal;
        }
        if (loan.status === LoanStatus.REPAID && loan.dueDate <= windowStart) {
          initialEarnings += principal * toFraction(loan.interestRate);
        }
      }
    });
    
    const trends = [];
    let runningPortfolio = initialPortfolio;
    let runningEarnings = initialEarnings;
    
    // Generate buckets
    const buckets = timeframe === '1y' ? 12 : timeframeDays;
    const isMonthly = timeframe === '1y';
    
    for (let i = buckets - 1; i >= 0; i--) {
      const bucketStart = isMonthly ?
        new Date(now.getFullYear(), now.getMonth() - i, 1).getTime() / 1000 :
        windowStart + ((buckets - 1 - i) * 24 * 60 * 60);
        
      const bucketEnd = isMonthly ?
        new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59).getTime() / 1000 :
        bucketStart + (24 * 60 * 60);
      
      const periodKey = isMonthly ?
        new Date(bucketStart * 1000).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) :
        new Date(bucketStart * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Add funded loans in this bucket
      const fundedInBucket = userLenderLoans
        .filter(loan => loan.fundedAt >= bucketStart && loan.fundedAt < bucketEnd)
        .reduce((sum, loan) => sum + parseFloat(formatEther(loan.amount)), 0);
      
      runningPortfolio += fundedInBucket;
      
      // Process repaid and defaulted loans in this bucket
      const resolvedInBucket = userLenderLoans.filter(loan => 
        ((loan.status === LoanStatus.REPAID || loan.status === LoanStatus.DEFAULTED) &&
         loan.dueDate >= bucketStart && loan.dueDate < bucketEnd)
      );
      
      const repaidPrincipal = resolvedInBucket
        .filter(loan => loan.status === LoanStatus.REPAID)
        .reduce((sum, loan) => sum + parseFloat(formatEther(loan.amount)), 0);
      
      const defaultedPrincipal = resolvedInBucket
        .filter(loan => loan.status === LoanStatus.DEFAULTED)
        .reduce((sum, loan) => sum + parseFloat(formatEther(loan.amount)), 0);
      
      const bucketInterest = resolvedInBucket
        .filter(loan => loan.status === LoanStatus.REPAID)
        .reduce((sum, loan) => {
          const principal = parseFloat(formatEther(loan.amount));
          return sum + (principal * toFraction(loan.interestRate));
        }, 0);
      
      // Track realized PnL: interest earned minus principal lost to defaults
      const bucketPnL = bucketInterest - defaultedPrincipal;
      
      runningPortfolio -= (repaidPrincipal + defaultedPrincipal);
      runningEarnings += bucketPnL;
      
      // Calculate total funded to date for ROI
      const totalFundedToDate = userLenderLoans
        .filter(loan => loan.fundedAt < bucketEnd)
        .reduce((sum, loan) => sum + parseFloat(formatEther(loan.amount)), 0);
      
      const roi = totalFundedToDate > 0 ? (runningEarnings / totalFundedToDate) * 100 : 0;
      
      trends.push({
        date: periodKey,
        portfolio: Math.max(0, parseFloat(runningPortfolio.toFixed(2))),
        earnings: parseFloat(runningEarnings.toFixed(4)),
        roi: parseFloat(roi.toFixed(2))
      });
    }
    
    return trends;
  };

  const generateRiskVsReturnData = (loans: Loan[]) => {
    const riskBuckets = [10, 15, 20, 25, 30]; // Interest rate percentages
    return riskBuckets.map(rate => {
      const loansInBucket = loans.filter(l => 
        Math.abs(toPercentNumber(l.interestRate) - rate) < 2.5
      );
      
      const actualReturn = loansInBucket.length > 0 ?
        loansInBucket.reduce((sum, loan) => {
          if (loan.status === LoanStatus.REPAID) {
            return sum + toPercentNumber(loan.interestRate);
          }
          return sum;
        }, 0) / loansInBucket.length : 0;
      
      return {
        risk: rate,
        expectedReturn: rate,
        actualReturn: parseFloat(actualReturn.toFixed(2))
      };
    });
  };

  const generatePerformanceComparison = (loans: Loan[], userAccount: string | null) => {
    if (!userAccount) return [];
    
    const userAsLender = loans.filter(l => l.lender.toLowerCase() === userAccount.toLowerCase());
    const allLenders = new Set(loans.map(l => l.lender)).size;
    
    const userAvgInterest = userAsLender.length > 0 ?
      userAsLender.reduce((sum, l) => sum + toPercentNumber(l.interestRate), 0) / userAsLender.length : 0;
    
    const platformAvgInterest = loans.length > 0 ?
      loans.reduce((sum, l) => sum + toPercentNumber(l.interestRate), 0) / loans.length : 0;
    
    const userSuccessRate = userAsLender.length > 0 ?
      (userAsLender.filter(l => l.status === LoanStatus.REPAID).length / userAsLender.length) * 100 : 0;
    
    const platformSuccessRate = loans.length > 0 ?
      (loans.filter(l => l.status === LoanStatus.REPAID).length / loans.length) * 100 : 0;
    
    const userActiveLoans = userAsLender.filter(l => l.status === LoanStatus.FUNDED).length;
    const avgActiveLoansPerLender = allLenders > 0 ? 
      loans.filter(l => l.status === LoanStatus.FUNDED).length / allLenders : 0;
    
    return [
      {
        category: 'Avg Interest Rate (%)',
        userValue: parseFloat(userAvgInterest.toFixed(1)),
        platformAverage: parseFloat(platformAvgInterest.toFixed(1))
      },
      {
        category: 'Success Rate (%)',
        userValue: parseFloat(userSuccessRate.toFixed(1)),
        platformAverage: parseFloat(platformSuccessRate.toFixed(1))
      },
      {
        category: 'Active Loans Count',
        userValue: userActiveLoans,
        platformAverage: parseFloat(avgActiveLoansPerLender.toFixed(1))
      }
    ];
  };

  const calculateRiskAdjustedReturn = (loans: Loan[]) => {
    if (loans.length === 0) return 0;
    
    const weightedReturn = loans.reduce((sum, loan) => {
      const interestPercent = toPercentNumber(loan.interestRate);
      const riskWeight = Math.max(0.1, 1 - (interestPercent / 50)); // Higher interest = higher risk, lower weight
      const expectedReturn = interestPercent;
      return sum + (expectedReturn * riskWeight);
    }, 0);
    
    return parseFloat((weightedReturn / loans.length).toFixed(2));
  };

  const EarningsCalculator = () => {
    const [calculatorAmount, setCalculatorAmount] = useState('10');
    const [calculatorRate, setCalculatorRate] = useState('15');
    const [calculatorDays, setCalculatorDays] = useState('90');

    const calculateProjection = () => {
      const amount = parseFloat(calculatorAmount);
      const rate = parseFloat(calculatorRate);
      const days = parseFloat(calculatorDays);
      
      const interest = (amount * rate / 100) * (days / 365);
      const total = amount + interest;
      
      return { interest: interest.toFixed(4), total: total.toFixed(4) };
    };

    const projection = calculateProjection();

    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <Calculator className="text-blue-400" size={20} />
          <h3 className="text-lg font-semibold text-white">Earnings Calculator</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Loan Amount (ETH)
            </label>
            <input
              type="number"
              step="0.1"
              value={calculatorAmount}
              onChange={(e) => setCalculatorAmount(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Interest Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={calculatorRate}
              onChange={(e) => setCalculatorRate(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Duration (days)
            </label>
            <input
              type="number"
              value={calculatorDays}
              onChange={(e) => setCalculatorDays(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-400">Interest Earned</div>
              <div className="text-xl font-bold text-green-400">{projection.interest} ETH</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Total Return</div>
              <div className="text-xl font-bold text-blue-400">{projection.total} ETH</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    loadAnalytics();
  }, [contract, account, timeframe]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="mx-auto text-gray-600 mb-4" size={48} />
        <p className="text-gray-500">Analytics data not available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Timeframe Selection */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
          <p className="text-gray-400">Platform performance and insights</p>
        </div>
        
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
          {(['7d', '30d', '90d', '1y'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                timeframe === period
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* User Earnings Summary (if connected) */}
      {account && (
        <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Your Portfolio Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{userEarnings.totalEarned.toFixed(4)} ETH</div>
              <div className="text-sm text-gray-400">Total Earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{userEarnings.projectedMonthly.toFixed(4)} ETH</div>
              <div className="text-sm text-gray-400">Projected Monthly</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{userEarnings.activeInvestments.toFixed(4)} ETH</div>
              <div className="text-sm text-gray-400">Active Investments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{userEarnings.projectedAnnual.toFixed(4)} ETH</div>
              <div className="text-sm text-gray-400">Projected Annual</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-400">{userEarnings.riskAdjustedReturn.toFixed(2)}%</div>
              <div className="text-sm text-gray-400">Risk-Adjusted Return</div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-900/30 rounded-lg">
              <DollarSign className="text-blue-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{analytics.totalVolume.toFixed(2)} ETH</div>
              <div className="text-sm text-gray-400">Total Volume</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-900/30 rounded-lg">
              <Target className="text-green-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{analytics.performanceMetrics.successRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Success Rate</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-900/30 rounded-lg">
              <TrendingUp className="text-purple-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{analytics.averageInterestRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Avg Interest Rate</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-900/30 rounded-lg">
              <Users className="text-indigo-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{analytics.activeLoans}</div>
              <div className="text-sm text-gray-400">Active Loans</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Volume Chart - Interactive */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-2 mb-6">
            <BarChart3 className="text-blue-400" size={20} />
            <h3 className="text-lg font-semibold text-white">
              {timeframe === '1y' ? 'Monthly Volume' : 'Daily Volume'}
            </h3>
          </div>
          
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.monthlyVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="month" 
                stroke="#9CA3AF" 
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF" 
                fontSize={12}
                tickFormatter={(value) => `${value} ETH`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#F9FAFB'
                }}
                formatter={(value: any) => [`${value} ETH`, 'Volume']}
              />
              <Bar 
                dataKey="volume" 
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution - Interactive Pie Chart */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-2 mb-6">
            <PieChart className="text-purple-400" size={20} />
            <h3 className="text-lg font-semibold text-white">Risk Distribution</h3>
          </div>
          
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPieChart>
              <Pie
                data={analytics.riskDistribution.map(item => ({
                  name: `${item.risk} Risk`,
                  value: item.count,
                  percentage: item.percentage,
                  fill: item.risk === 'Low' ? '#10B981' : 
                        item.risk === 'Medium' ? '#F59E0B' : '#EF4444'
                }))}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {analytics.riskDistribution.map((_, index) => {
                  const colors = ['#10B981', '#F59E0B', '#EF4444'];
                  return <Cell key={`cell-${index}`} fill={colors[index]} />;
                })}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#F9FAFB'
                }}
                formatter={(value: any, name: any) => [`${value} loans`, name]}
              />
              <Legend 
                wrapperStyle={{ color: '#F9FAFB', fontSize: '12px' }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Advanced Portfolio Analytics */}
      {account && (
        <>
          {/* Portfolio Performance Trends */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center space-x-2 mb-6">
              <Activity className="text-green-400" size={20} />
              <h3 className="text-lg font-semibold text-white">Portfolio Performance Trends</h3>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={analytics.portfolioTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickFormatter={(value) => `${value} ETH`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#F9FAFB'
                  }}
                  formatter={(value: any, name: any) => {
                    if (name === 'Portfolio Value') return [`${value} ETH`, name];
                    if (name === 'ROI') return [`${value}%`, name];
                    return [`${value} ETH`, name];
                  }}
                />
                <Bar 
                  yAxisId="left"
                  dataKey="portfolio" 
                  fill="#3B82F6"
                  name="Portfolio Value"
                  radius={[4, 4, 0, 0]}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="roi" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="ROI"
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Risk vs Return Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center space-x-2 mb-6">
                <TrendingUp className="text-yellow-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Risk vs Return Analysis</h3>
              </div>
              
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={analytics.riskVsReturn}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="risk" 
                    stroke="#9CA3AF" 
                    fontSize={12}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis 
                    stroke="#9CA3AF" 
                    fontSize={12}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#F9FAFB'
                    }}
                    formatter={(value: any, name: any) => [`${value}%`, name]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expectedReturn" 
                    stackId="1" 
                    stroke="#F59E0B" 
                    fill="#F59E0B"
                    fillOpacity={0.3}
                    name="Expected Return"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="actualReturn" 
                    stackId="1" 
                    stroke="#10B981" 
                    fill="#10B981"
                    fillOpacity={0.6}
                    name="Actual Return"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Comparison */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center space-x-2 mb-6">
                <Award className="text-purple-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Performance vs Platform</h3>
              </div>
              
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.performanceComparison} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                  <YAxis 
                    type="category" 
                    dataKey="category" 
                    stroke="#9CA3AF" 
                    fontSize={10}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#F9FAFB'
                    }}
                  />
                  <Bar dataKey="userValue" fill="#3B82F6" name="Your Performance" />
                  <Bar dataKey="platformAverage" fill="#6B7280" name="Platform Average" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Earnings Calculator */}
      <EarningsCalculator />

      {/* Performance Metrics */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-2 mb-6">
          <Calendar className="text-indigo-400" size={20} />
          <h3 className="text-lg font-semibold text-white">Platform Performance</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{analytics.averageLoanAmount.toFixed(2)} ETH</div>
            <div className="text-sm text-gray-400">Average Loan Size</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white">{analytics.averageDuration.toFixed(0)} days</div>
            <div className="text-sm text-gray-400">Average Duration</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white">{analytics.performanceMetrics.roi.toFixed(1)}%</div>
            <div className="text-sm text-gray-400">Average ROI</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white">{analytics.performanceMetrics.averageRepaymentTime.toFixed(0)} days</div>
            <div className="text-sm text-gray-400">Avg Repayment Time</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;