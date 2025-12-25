import React, { useState, useEffect } from 'react';
import { Search, Filter, TrendingUp, Users, Star, Shield, DollarSign } from 'lucide-react';
import { formatEther } from 'ethers';
import { useContract } from '../hooks/useContract';
import { Loan, LoanStatus } from '../types/loan';
import { BorrowerReputation } from '../types/reputation';
import LoanCard from './LoanCard';
import LoanFilter, { LoanFilters } from './LoanFilter';
import { filterLoans, sortLoans } from '../utils/loanFilters';

const BrowseLoans: React.FC = () => {
  const { contract } = useContract();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [reputations, setReputations] = useState<Map<string, BorrowerReputation>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'low-risk' | 'verified' | 'new-borrowers'>('all');
  const [filters, setFilters] = useState<LoanFilters>({
    search: '',
    amountMin: '',
    amountMax: '',
    interestRateMin: '',
    interestRateMax: '',
    durationMin: '',
    durationMax: '',
    sortBy: 'newest',
    viewMode: 'grid'
  });

  const loadLoans = async () => {
    if (!contract) return;

    try {
      setIsLoading(true);

      // Get only active loan requests (REQUESTED status)
      const activeLoanIds = await contract.getActiveLoanRequests();
      
      // Fetch loan details
      const loanPromises = activeLoanIds.map(async (loanId: any) => {
        const loanData = await contract.loans(loanId);
        
        // Get lenders for this loan if function exists
        let lenders: string[] = [];
        let lenderAmounts: string[] = [];
        try {
          const lenderInfo = await contract.getLoanLenders(loanId);
          if (lenderInfo && lenderInfo.length === 2) {
            lenders = lenderInfo[0] || [];
            lenderAmounts = (lenderInfo[1] || []).map((amount: any) => amount.toString());
          }
        } catch (e) {
          // getLoanLenders might not exist, continue without lender info
        }
        
        return {
          id: Number(loanData.id.toString()),
          borrower: loanData.borrower,
          lenders,
          lenderAmounts,
          totalAmount: loanData.amount.toString(),
          totalFunded: loanData.amountFunded.toString(),
          loanToken: Number(loanData.tokenId),
          collateralToken: Number(loanData.collateralTokenId),
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

      const loadedLoans = await Promise.all(loanPromises);
      
      // Load borrower reputations
      const reputationMap = new Map<string, BorrowerReputation>();
      for (const loan of loadedLoans) {
        if (!reputationMap.has(loan.borrower)) {
          const reputation = await loadBorrowerReputation(loan.borrower);
          reputationMap.set(loan.borrower, reputation);
        }
      }

      setLoans(loadedLoans.sort((a, b) => b.createdAt - a.createdAt));
      setReputations(reputationMap);
    } catch (error) {
      console.error('Error loading loans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBorrowerReputation = async (borrowerAddress: string): Promise<BorrowerReputation> => {
    try {
      if (!contract) throw new Error('Contract not available');
      
      // Get all loans for this borrower
      const borrowerLoans = await contract.borrowerLoans(borrowerAddress);
      
      let totalLoans = 0;
      let successfulLoans = 0;
      let defaultedLoans = 0;
      let totalBorrowed = '0';
      let totalRepaid = '0';
      let onTimePayments = 0;
      let latePayments = 0;
      let totalRepaymentDays = 0;

      // Calculate reputation metrics from loan history
      for (const loanId of borrowerLoans) {
        const loanData = await contract.loans(loanId);
        totalLoans++;

        const loanAmount = parseFloat(formatEther(loanData.amount.toString()));
        totalBorrowed = (parseFloat(totalBorrowed) + loanAmount).toString();

        if (loanData.status === LoanStatus.REPAID) {
          successfulLoans++;
          const repaidAmount = loanAmount * (1 + loanData.interestRate / 10000);
          totalRepaid = (parseFloat(totalRepaid) + repaidAmount).toString();
          
          // Calculate if payment was on time
          const repaymentTime = loanData.fundedAt + loanData.duration;
          if (loanData.dueDate <= repaymentTime) {
            onTimePayments++;
          } else {
            latePayments++;
          }
          
          totalRepaymentDays += (loanData.dueDate - loanData.fundedAt) / (24 * 60 * 60);
        } else if (loanData.status === LoanStatus.DEFAULTED) {
          defaultedLoans++;
        }
      }

      const repaymentRate = totalLoans > 0 ? (successfulLoans / totalLoans) * 100 : 100;
      const averageRepaymentTime = successfulLoans > 0 ? totalRepaymentDays / successfulLoans : 0;
      
      // Calculate credit score (0-100)
      let creditScore = 50; // Base score
      
      // Repayment history (40% weight)
      creditScore += (repaymentRate - 50) * 0.8;
      
      // On-time payment rate (30% weight)
      const onTimeRate = (onTimePayments + latePayments) > 0 ? onTimePayments / (onTimePayments + latePayments) : 1;
      creditScore += (onTimeRate * 100 - 50) * 0.6;
      
      // Experience bonus (20% weight)
      if (totalLoans >= 10) creditScore += 10;
      else if (totalLoans >= 5) creditScore += 5;
      else if (totalLoans >= 2) creditScore += 2;
      
      // Volume bonus (10% weight)
      const totalBorrowedEth = parseFloat(totalBorrowed);
      if (totalBorrowedEth >= 100) creditScore += 5;
      else if (totalBorrowedEth >= 10) creditScore += 3;
      else if (totalBorrowedEth >= 1) creditScore += 1;

      creditScore = Math.max(0, Math.min(100, Math.round(creditScore)));

      const getRiskLevel = (score: number): 'Low' | 'Medium' | 'High' => {
        if (score >= 70) return 'Low';
        if (score >= 40) return 'Medium';
        return 'High';
      };

      return {
        address: borrowerAddress,
        totalLoans,
        successfulLoans,
        defaultedLoans,
        totalBorrowed,
        totalRepaid,
        averageRepaymentTime,
        repaymentRate,
        creditScore,
        riskLevel: getRiskLevel(creditScore),
        isVerified: creditScore >= 60 && totalLoans >= 2,
        verificationBadges: creditScore >= 60 ? ['address', 'experience'] : [],
        joinedDate: Date.now() - (totalLoans * 30 * 24 * 60 * 60 * 1000), // Rough estimate
        lastActivityDate: Date.now(),
        onTimePayments,
        latePayments
      };
    } catch (error) {
      console.error('Error loading borrower reputation:', error);
      return {
        address: borrowerAddress,
        totalLoans: 0,
        successfulLoans: 0,
        defaultedLoans: 0,
        totalBorrowed: '0',
        totalRepaid: '0',
        averageRepaymentTime: 0,
        repaymentRate: 0,
        creditScore: 50,
        riskLevel: 'Medium',
        isVerified: false,
        verificationBadges: [],
        joinedDate: Date.now(),
        lastActivityDate: Date.now(),
        onTimePayments: 0,
        latePayments: 0
      };
    }
  };

  useEffect(() => {
    loadLoans();
  }, [contract]);

  const getCategoryFilteredLoans = () => {
    switch (selectedCategory) {
      case 'low-risk':
        return loans.filter(loan => {
          const reputation = reputations.get(loan.borrower);
          return reputation && reputation.riskLevel === 'Low';
        });
      case 'verified':
        return loans.filter(loan => {
          const reputation = reputations.get(loan.borrower);
          return reputation && reputation.isVerified;
        });
      case 'new-borrowers':
        return loans.filter(loan => {
          const reputation = reputations.get(loan.borrower);
          return reputation && reputation.totalLoans <= 2;
        });
      default:
        return loans;
    }
  };

  const getFilteredAndSortedLoans = () => {
    const categoryFiltered = getCategoryFilteredLoans();
    const filtered = filterLoans(categoryFiltered, filters);
    return sortLoans(filtered, filters.sortBy);
  };

  const processedLoans = getFilteredAndSortedLoans();

  const getMarketplaceStats = () => {
    const totalAvailable = loans.length;
    const totalVolume = loans.reduce((sum, loan) => sum + parseFloat(formatEther(loan.totalAmount)), 0);
    const averageRate = loans.length > 0 ? loans.reduce((sum, loan) => sum + loan.interestRate, 0) / loans.length / 100 : 0;
    const verifiedBorrowers = Array.from(reputations.values()).filter(rep => rep.isVerified).length;

    return { totalAvailable, totalVolume, averageRate, verifiedBorrowers };
  };

  const stats = getMarketplaceStats();

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Browse Loan Marketplace</h1>
            <p className="text-gray-400">Discover lending opportunities with detailed borrower insights</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-400">{stats.totalAvailable}</div>
            <div className="text-sm text-gray-400">Active Requests</div>
          </div>
        </div>
      </div>

      {/* Marketplace Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-2">
            <DollarSign className="text-green-400" size={20} />
            <div>
              <div className="text-lg font-semibold text-white">{stats.totalVolume.toFixed(2)} ETH</div>
              <div className="text-xs text-gray-400">Total Available</div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-2">
            <TrendingUp className="text-blue-400" size={20} />
            <div>
              <div className="text-lg font-semibold text-white">{stats.averageRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-400">Avg Interest Rate</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-2">
            <Shield className="text-purple-400" size={20} />
            <div>
              <div className="text-lg font-semibold text-white">{stats.verifiedBorrowers}</div>
              <div className="text-xs text-gray-400">Verified Borrowers</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-2">
            <Users className="text-indigo-400" size={20} />
            <div>
              <div className="text-lg font-semibold text-white">{reputations.size}</div>
              <div className="text-xs text-gray-400">Unique Borrowers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: 'all', label: 'All Loans', icon: Search },
          { key: 'low-risk', label: 'Low Risk', icon: Shield },
          { key: 'verified', label: 'Verified Borrowers', icon: Star },
          { key: 'new-borrowers', label: 'New Borrowers', icon: Users }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              selectedCategory === key
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
            }`}
          >
            <Icon size={16} />
            <span className="text-sm font-medium">{label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              selectedCategory === key ? 'bg-blue-500/20 text-blue-200' : 'bg-gray-700 text-gray-400'
            }`}>
              {key === 'all' ? loans.length : getCategoryFilteredLoans().length}
            </span>
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      <LoanFilter 
        filters={filters}
        onFiltersChange={setFilters}
        onToggleView={() => setFilters(prev => ({ ...prev, viewMode: prev.viewMode === 'grid' ? 'list' : 'grid' }))}
      />

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Showing {processedLoans.length} of {loans.length} loans
          {selectedCategory !== 'all' && (
            <span className="ml-1">in {selectedCategory.replace('-', ' ')} category</span>
          )}
        </div>
        
        <button
          onClick={loadLoans}
          disabled={isLoading}
          className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors text-sm"
        >
          <span>Refresh</span>
        </button>
      </div>

      {/* Loans Display */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      ) : processedLoans.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {processedLoans.map((loan) => {
            const reputation = reputations.get(loan.borrower);
            return (
              <div key={loan.id} className="relative">
                <LoanCard loan={loan} onUpdate={loadLoans} />
                
                {/* Enhanced Borrower Info Overlay */}
                {reputation && (
                  <div className="absolute -top-2 -right-2 flex space-x-1">
                    {reputation.isVerified && (
                      <div className="bg-green-500 rounded-full p-1" title="Verified Borrower">
                        <Shield className="text-white" size={12} />
                      </div>
                    )}
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      reputation.riskLevel === 'Low' ? 'bg-green-900/30 text-green-400' :
                      reputation.riskLevel === 'Medium' ? 'bg-yellow-900/30 text-yellow-400' :
                      'bg-red-900/30 text-red-400'
                    }`}>
                      {reputation.creditScore}/100
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Filter className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No loans found</h3>
          <p className="text-gray-500">
            {selectedCategory !== 'all' 
              ? `No loans match the ${selectedCategory.replace('-', ' ')} category and your current filters.`
              : 'No loans match your current filters. Try adjusting your search criteria.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default BrowseLoans;