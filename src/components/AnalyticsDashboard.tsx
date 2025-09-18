import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Users, Target, BarChart3, PieChart, Calendar, Calculator } from 'lucide-react';
import { formatEther } from 'ethers';
import { BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
    activeInvestments: 0
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
          lender: loanData.lender,
          amount: loanData.amount.toString(),
          collateral: loanData.collateral.toString(),
          interestRate: Number(loanData.interestRate.toString()),
          duration: Number(loanData.duration.toString()),
          createdAt: Number(loanData.createdAt.toString()),
          fundedAt: Number(loanData.fundedAt.toString()),
          dueDate: Number(loanData.dueDate.toString()),
          status: loanData.status as LoanStatus,
          collateralClaimed: loanData.collateralClaimed,
        } as Loan;
      });

      const loans = await Promise.all(loanPromises);
      
      // Calculate analytics
      const totalVolume = loans.reduce((sum, loan) => sum + parseFloat(formatEther(loan.amount)), 0);
      const totalLoans = loans.length;
      const activeLoans = loans.filter(l => l.status === LoanStatus.FUNDED).length;
      const repaidLoans = loans.filter(l => l.status === LoanStatus.REPAID).length;
      const defaultedLoans = loans.filter(l => l.status === LoanStatus.DEFAULTED).length;
      const averageInterestRate = loans.length > 0 ? 
        loans.reduce((sum, loan) => sum + loan.interestRate, 0) / loans.length / 100 : 0;
      const averageLoanAmount = totalVolume / (totalLoans || 1);
      const averageDuration = loans.length > 0 ?
        loans.reduce((sum, loan) => sum + loan.duration, 0) / loans.length / (24 * 60 * 60) : 0;

      // Generate monthly data from real loan timestamps
      const monthlyVolume = generateMonthlyData(loans);
      const riskDistribution = calculateRiskDistribution(loans);
      
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
          const interest = principal * (loan.interestRate / 10000);
          return sum + interest;
        }, 0);

        const activeLenderLoans = loans.filter(l => 
          l.lender.toLowerCase() === account.toLowerCase() && l.status === LoanStatus.FUNDED
        );
        const projectedMonthly = activeLenderLoans.reduce((sum, loan) => {
          const principal = parseFloat(formatEther(loan.amount));
          const annualInterest = principal * (loan.interestRate / 10000);
          return sum + (annualInterest / 12);
        }, 0);

        const activeInvestments = activeLenderLoans.reduce((sum, loan) => 
          sum + parseFloat(formatEther(loan.amount)), 0
        );

        setUserEarnings({ totalEarned, projectedMonthly, activeInvestments });
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
        }
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMonthlyData = (loans: Loan[]) => {
    // Create real data from loan timestamps
    const monthlyData = new Map<string, { volume: number; loans: number }>();
    
    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      monthlyData.set(monthKey, { volume: 0, loans: 0 });
    }
    
    // Aggregate loan data by month
    loans.forEach(loan => {
      const loanDate = new Date(loan.createdAt * 1000);
      const monthKey = loanDate.toLocaleDateString('en-US', { month: 'short' });
      const existing = monthlyData.get(monthKey);
      if (existing) {
        existing.volume += parseFloat(formatEther(loan.amount));
        existing.loans += 1;
      }
    });
    
    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      volume: parseFloat(data.volume.toFixed(2)),
      loans: data.loans
    }));
  };

  const calculateRiskDistribution = (loans: Loan[]) => {
    const riskCounts = { Low: 0, Medium: 0, High: 0 };
    
    loans.forEach(loan => {
      const interestRate = loan.interestRate / 100;
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
    const repaidLoans = loans.filter(l => l.status === LoanStatus.REPAID);
    if (repaidLoans.length === 0) return 0;

    const totalPrincipal = repaidLoans.reduce((sum, loan) => 
      sum + parseFloat(formatEther(loan.amount)), 0
    );
    const totalReturns = repaidLoans.reduce((sum, loan) => {
      const principal = parseFloat(formatEther(loan.amount));
      const interest = principal * (loan.interestRate / 10000);
      return sum + principal + interest;
    }, 0);

    return totalPrincipal > 0 ? ((totalReturns - totalPrincipal) / totalPrincipal) * 100 : 0;
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <h3 className="text-lg font-semibold text-white">Monthly Volume</h3>
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