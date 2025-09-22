import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Award, 
  Target, 
  Activity, 
  DollarSign,
  Clock,
  Zap,
  Star,
  BarChart3
} from 'lucide-react';
// formatEther imported for future use
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar } from 'recharts';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { EnhancedReputationData, ReputationMetrics, CreditHistoryEntry } from '../types/reputation';

interface MarketMetrics {
  totalVolume: number;
  activeLoans: number;
  averageInterestRate: number;
  defaultRate: number;
  platformTVL: number;
  monthlyGrowth: number;
}

interface UserMetrics {
  creditScore: number;
  reputationScore: number;
  totalEarnings: number;
  riskAdjustedReturns: number;
  platformRank: number;
  badgesEarned: number;
}

const EnhancedAnalyticsDashboard: React.FC = () => {
  const { contract } = useContract();
  const { account } = useWallet();
  const [marketMetrics, setMarketMetrics] = useState<MarketMetrics | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [reputationData, setReputationData] = useState<EnhancedReputationData | null>(null);
  const [creditHistory, setCreditHistory] = useState<CreditHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Reputation radar chart data
  const getRadarData = (metrics: ReputationMetrics) => [
    { subject: 'Trustworthiness', value: metrics.trustworthiness, fullMark: 100 },
    { subject: 'Reliability', value: metrics.reliability, fullMark: 100 },
    { subject: 'Experience', value: metrics.experience, fullMark: 100 },
    { subject: 'Efficiency', value: metrics.efficiency, fullMark: 100 },
    { subject: 'Consistency', value: (metrics.trustworthiness + metrics.reliability) / 2, fullMark: 100 },
    { subject: 'Performance', value: (metrics.experience + metrics.efficiency) / 2, fullMark: 100 },
  ];

  // Credit score trend data
  const getCreditTrendData = () => {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Simulate credit score evolution (in real app, this would come from backend)
      const baseScore = 650;
      const variation = Math.sin(i / 10) * 50 + Math.random() * 20;
      
      data.push({
        date: date.toLocaleDateString(),
        creditScore: Math.round(baseScore + variation),
        reputationScore: Math.round((baseScore + variation) * 1.2),
        riskScore: Math.round(Math.max(0, 100 - (baseScore + variation) / 10))
      });
    }
    
    return data;
  };

  // Performance comparison data
  const getPerformanceData = () => [
    { metric: 'Avg Return', user: 12.5, platform: 8.2, excellent: 15.0 },
    { metric: 'Success Rate', user: 94, platform: 87, excellent: 98 },
    { metric: 'Response Time', user: 2.1, platform: 4.3, excellent: 1.5 },
    { metric: 'Volume', user: 85000, platform: 45000, excellent: 120000 },
  ];

  const loadAnalytics = async () => {
    if (!contract || !account) return;
    
    try {
      setIsLoading(true);
      
      // Fetch real market metrics from backend
      try {
        const response = await fetch(`http://localhost:3001/api/analytics/market`);
        const marketData = await response.json();
        setMarketMetrics(marketData);
      } catch (error) {
        console.warn('Backend analytics unavailable, using fallback data');
        const activeLoanIds = await contract.getActiveLoanRequests();
        setMarketMetrics({
          totalVolume: 0,
          activeLoans: activeLoanIds.length,
          averageInterestRate: 0,
          defaultRate: 0,
          platformTVL: 0,
          monthlyGrowth: 0
        });
      }

      // Fetch user metrics (simulated)
      setUserMetrics({
        creditScore: 745,
        reputationScore: 892,
        totalEarnings: 12500,
        riskAdjustedReturns: 15.2,
        platformRank: 143,
        badgesEarned: 7
      });

      // Fetch reputation data (simulated)
      setReputationData({
        address: account,
        creditScore: 745,
        totalLoans: 24,
        repaidLoans: 23,
        defaultedLoans: 1,
        avgRepaymentTime: 12.5,
        onTimePayments: 22,
        latePayments: 1,
        totalVolumeUSD: 125000,
        reputationRank: 'Gold',
        consecutiveOnTimePayments: 8,
        timeAsLender: 180,
        timeAsBorrower: 90,
        averageLoanSize: 5200,
        riskAdjustedReturns: 15.2,
        platformLoyalty: 85,
        socialCredibility: 78,
        creditHistory: [],
        metrics: {
          trustworthiness: 92,
          reliability: 88,
          experience: 75,
          efficiency: 94,
          riskProfile: 'Moderate',
          reputationTrend: 'Improving'
        },
        verificationBadges: [],
        reputationScore: 892
      });

      // Generate credit history (simulated)
      const history: CreditHistoryEntry[] = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          timestamp: Date.now() - (i * 7 * 24 * 60 * 60 * 1000),
          action: i % 4 === 0 ? 'LOAN_REPAID' : i % 4 === 1 ? 'LOAN_FUNDED' : 'LOAN_REQUESTED',
          loanId: 1000 + i,
          amount: (Math.random() * 10000 + 1000).toString(),
          creditScoreChange: Math.floor(Math.random() * 20 - 10),
          newCreditScore: 745 + Math.floor(Math.random() * 50 - 25),
          details: 'Loan completed successfully'
        });
      }
      setCreditHistory(history);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [contract, account, timeframe]);

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'Diamond': return 'text-cyan-400 bg-cyan-900/20';
      case 'Platinum': return 'text-gray-300 bg-gray-700/20';
      case 'Gold': return 'text-yellow-400 bg-yellow-900/20';
      case 'Silver': return 'text-gray-400 bg-gray-600/20';
      case 'Bronze': return 'text-orange-400 bg-orange-900/20';
      default: return 'text-gray-400 bg-gray-600/20';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'Improving': return <TrendingUp className="text-green-400" size={16} />;
      case 'Stable': return <Activity className="text-blue-400" size={16} />;
      case 'Declining': return <TrendingUp className="text-red-400 rotate-180" size={16} />;
      default: return <Activity className="text-gray-400" size={16} />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading advanced analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Advanced Analytics</h2>
          <p className="text-gray-400">Comprehensive platform and personal performance insights</p>
        </div>
        
        <div className="flex space-x-2">
          {(['7d', '30d', '90d', '1y'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeframe === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {userMetrics && (
          <>
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Credit Score</p>
                  <p className="text-2xl font-bold text-white">{userMetrics.creditScore}</p>
                  <p className="text-green-400 text-sm flex items-center mt-1">
                    <TrendingUp size={14} className="mr-1" />
                    +23 this month
                  </p>
                </div>
                <div className="p-3 bg-blue-600 rounded-lg">
                  <Award className="text-white" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Reputation Score</p>
                  <p className="text-2xl font-bold text-white">{userMetrics.reputationScore}</p>
                  <p className="text-green-400 text-sm flex items-center mt-1">
                    <Star size={14} className="mr-1" />
                    Rank #{userMetrics.platformRank}
                  </p>
                </div>
                <div className="p-3 bg-purple-600 rounded-lg">
                  <Target className="text-white" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Earnings</p>
                  <p className="text-2xl font-bold text-white">${userMetrics.totalEarnings.toLocaleString()}</p>
                  <p className="text-green-400 text-sm flex items-center mt-1">
                    <DollarSign size={14} className="mr-1" />
                    {userMetrics.riskAdjustedReturns}% APY
                  </p>
                </div>
                <div className="p-3 bg-green-600 rounded-lg">
                  <DollarSign className="text-white" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Badges Earned</p>
                  <p className="text-2xl font-bold text-white">{userMetrics.badgesEarned}</p>
                  {reputationData && (
                    <p className={`text-sm px-2 py-1 rounded-lg inline-block mt-1 ${getRankColor(reputationData.reputationRank)}`}>
                      {reputationData.reputationRank}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-yellow-600 rounded-lg">
                  <Zap className="text-white" size={24} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credit Score Trend */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Credit Score Evolution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={getCreditTrendData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="creditScore" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.1}
                name="Credit Score"
              />
              <Area 
                type="monotone" 
                dataKey="reputationScore" 
                stroke="#8B5CF6" 
                fill="#8B5CF6" 
                fillOpacity={0.1}
                name="Reputation Score"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Reputation Radar */}
        {reputationData && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Reputation Analysis</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={getRadarData(reputationData.metrics)}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                />
                <Radar
                  name="Your Score"
                  dataKey="value"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Performance Comparison */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Performance vs Platform Average</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={getPerformanceData()}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="metric" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="user" fill="#3B82F6" name="Your Performance" />
            <Bar dataKey="platform" fill="#6B7280" name="Platform Average" />
            <Bar dataKey="excellent" fill="#10B981" name="Top Performers" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Credit History */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Credit History</h3>
        <div className="space-y-4">
          {creditHistory.slice(0, 5).map((entry, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${
                  entry.action === 'LOAN_REPAID' ? 'bg-green-900/20 text-green-400' :
                  entry.action === 'LOAN_FUNDED' ? 'bg-blue-900/20 text-blue-400' :
                  'bg-yellow-900/20 text-yellow-400'
                }`}>
                  {entry.action === 'LOAN_REPAID' ? <Clock size={16} /> :
                   entry.action === 'LOAN_FUNDED' ? <DollarSign size={16} /> :
                   <BarChart3 size={16} />}
                </div>
                <div>
                  <p className="text-white font-medium">{entry.action.replace('_', ' ')}</p>
                  <p className="text-gray-400 text-sm">
                    Loan #{entry.loanId} • {new Date(entry.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white">${parseFloat(entry.amount).toLocaleString()}</p>
                <p className={`text-sm ${
                  entry.creditScoreChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {entry.creditScoreChange >= 0 ? '+' : ''}{entry.creditScoreChange} pts
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Insights */}
      {marketMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h4 className="text-lg font-semibold text-white mb-4">Market Overview</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Volume</span>
                <span className="text-white font-medium">${marketMetrics.totalVolume.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Loans</span>
                <span className="text-white font-medium">{marketMetrics.activeLoans}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Interest</span>
                <span className="text-white font-medium">{marketMetrics.averageInterestRate}%</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h4 className="text-lg font-semibold text-white mb-4">Risk Metrics</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Default Rate</span>
                <span className="text-red-400 font-medium">{marketMetrics.defaultRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Platform TVL</span>
                <span className="text-white font-medium">${marketMetrics.platformTVL.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Monthly Growth</span>
                <span className="text-green-400 font-medium">+{marketMetrics.monthlyGrowth}%</span>
              </div>
            </div>
          </div>

          {reputationData && (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4">Your Performance</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Trend</span>
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(reputationData.metrics.reputationTrend)}
                    <span className="text-white font-medium">{reputationData.metrics.reputationTrend}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Risk Profile</span>
                  <span className="text-white font-medium">{reputationData.metrics.riskProfile}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Platform Loyalty</span>
                  <span className="text-white font-medium">{reputationData.platformLoyalty}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedAnalyticsDashboard;