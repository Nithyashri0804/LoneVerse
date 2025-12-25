import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Shield, Clock, RefreshCw, BarChart3 } from 'lucide-react';
import { formatEther } from 'ethers';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { Loan, LoanStatus } from '../types/loan';
import LoanCard from './LoanCard';
import LoanFilter, { LoanFilters } from './LoanFilter';
import LoanListView from './LoanListView';
import { filterLoans, sortLoans } from '../utils/loanFilters';

const Dashboard: React.FC = () => {
  const { contract } = useContract();
  const { account } = useWallet();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'borrowed' | 'lent'>('all');
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
    if (!contract || !account) return;

    try {
      setIsLoading(true);

      // Helper function to safely call contract functions that return arrays
      const safeContractCall = async (contractCall: () => Promise<any>): Promise<any[]> => {
        try {
          const result = await contractCall();
          return Array.isArray(result) ? result : [];
        } catch (error: any) {
          // Silently handle empty result decoding errors (common when no data exists yet)
          if (error.code === 'BAD_DATA' && error.value === '0x') {
            return [];
          }
          // Log unexpected errors
          console.warn('Unexpected contract call error:', error.message);
          return [];
        }
      };

      // Try to get loans by checking IDs directly (fallback method)
      let allLoanIds = new Set<number>();
      
      try {
        // First try the normal methods
        const activeLoanIds = await safeContractCall(() => contract.getActiveLoanRequests());
        const borrowerLoanIds = await safeContractCall(() => contract.borrowerLoans(account));
        const lenderLoanIds = await safeContractCall(() => contract.lenderLoans(account));

        // Combine all unique loan IDs
        allLoanIds = new Set([
          ...activeLoanIds.map((id: any) => Number(id.toString())),
          ...borrowerLoanIds.map((id: any) => Number(id.toString())),
          ...lenderLoanIds.map((id: any) => Number(id.toString())),
        ]);
        
        console.log('Loan IDs found:', Array.from(allLoanIds));
      } catch (error) {
        console.warn('Failed to get loan IDs from contract methods, trying direct approach:', error);
      }
      
      // If no loans found through normal methods, try checking for loans directly
      if (allLoanIds.size === 0) {
        console.log('No loans found through contract methods, checking for loans directly...');
        // Try to find loans by checking IDs 1-10 directly
        for (let i = 1; i <= 10; i++) {
          try {
            const loanData = await contract.loans(i);
            if (loanData && loanData.borrower && loanData.borrower !== '0x0000000000000000000000000000000000000000') {
              allLoanIds.add(i);
              console.log(`Found loan ${i}:`, loanData);
            }
          } catch (error) {
            // Loan doesn't exist, continue
          }
        }
      }

      // If no loans exist, set empty array and return
      if (allLoanIds.size === 0) {
        setLoans([]);
        return;
      }

      // Fetch loan details
      const loanPromises = Array.from(allLoanIds).map(async (loanId) => {
        try {
          const loanData = await contract.loans(loanId);
          
          // Handle potential undefined values with safe access
          const safeToString = (val: any) => val ? val.toString() : '0';
          const safeNumber = (val: any) => val ? Number(val.toString()) : 0;
          
          // Get lenders for this loan if function exists
          let lenders: string[] = [];
          let lenderAmounts: string[] = [];
          try {
            const lenderInfo = await contract.getLoanLenders(loanId);
            if (lenderInfo && lenderInfo.length === 2) {
              lenders = lenderInfo[0] || [];
              lenderAmounts = (lenderInfo[1] || []).map((amt: any) => safeToString(amt));
            }
          } catch (e) {
            // getLoanLenders might not exist, continue without lender info
          }
          
          const totalAmount = safeToString(loanData.amount);
          const collateralAmount = safeToString(loanData.collateralAmount);
          const totalFunded = safeToString(loanData.amountFunded || '0');
          
          return {
            id: loanId,
            borrower: loanData.borrower || '0x0000000000000000000000000000000000000000',
            lender: lenders.length > 0 ? lenders[0] : '0x0000000000000000000000000000000000000000',
            lenders,
            lenderAmounts,
            amount: totalAmount,
            totalAmount,
            totalFunded,
            loanToken: loanData.tokenId || 0,
            collateralToken: loanData.collateralTokenId || 0,
            collateral: collateralAmount,
            collateralAmount,
            interestRate: safeNumber(loanData.interestRate),
            isVariableRate: loanData.isVariableRate || false,
            duration: safeNumber(loanData.duration),
            minContribution: safeToString(loanData.minContribution || '0'),
            fundingDeadline: safeNumber(loanData.fundingDeadline),
            createdAt: safeNumber(loanData.createdAt),
            fundedAt: safeNumber(loanData.fundedAt),
            dueDate: safeNumber(loanData.dueDate),
            status: loanData.status as LoanStatus,
            collateralClaimed: loanData.collateralClaimed || false,
            riskScore: safeNumber(loanData.riskScore),
            hasInsurance: loanData.hasInsurance || false,
            insuranceFee: safeToString(loanData.insuranceFee),
            earlyRepaymentPenalty: safeNumber(loanData.earlyRepaymentPenalty),
            totalRepaid: safeToString(loanData.totalRepaid || '0'),
          } as Loan;
        } catch (error) {
          console.warn(`Failed to load loan ${loanId}:`, error);
          return null;
        }
      });

      const loadedLoans = (await Promise.all(loanPromises))
        .filter((loan): loan is Loan => loan !== null)
        .sort((a, b) => b.id - a.id);
      
      setLoans(loadedLoans);
    } catch (error) {
      console.error('Error loading loans:', error);
      setLoans([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, [contract, account]);

  const getFilteredAndSortedLoans = () => {
    // First filter by tab
    let tabFiltered = loans.filter((loan) => {
      if (!account) return activeTab === 'all';
      
      switch (activeTab) {
        case 'borrowed':
          return loan.borrower.toLowerCase() === account.toLowerCase();
        case 'lent':
          return loan.lenders.some(lender => lender.toLowerCase() === account.toLowerCase());
        default:
          return true;
      }
    });

    // Apply advanced filters
    const filtered = filterLoans(tabFiltered, filters);
    
    // Apply sorting
    return sortLoans(filtered, filters.sortBy);
  };

  const processedLoans = getFilteredAndSortedLoans();

  const getStats = () => {
    if (!account) {
      const totalVolume = loans.reduce((sum, loan) => {
        return sum + parseFloat(formatEther(loan.totalAmount));
      }, 0);
      const activeLoans = loans.filter(loan => loan.status === LoanStatus.FUNDED).length;
      const totalLoans = loans.length;
      return { totalBorrowed: 0, totalLent: 0, activeLoans, totalVolume, totalLoans };
    }
    
    const borrowedLoans = loans.filter(loan => loan.borrower.toLowerCase() === account.toLowerCase());
    const lentLoans = loans.filter(loan => loan.lenders.some(lender => lender.toLowerCase() === account.toLowerCase()));
    
    const totalBorrowed = borrowedLoans.reduce((sum, loan) => {
      return sum + parseFloat(formatEther(loan.totalAmount));
    }, 0);

    const totalLent = lentLoans.reduce((sum, loan) => {
      // Calculate the amount this user lent to this loan
      const lenderIndex = loan.lenders.findIndex(lender => lender.toLowerCase() === account.toLowerCase());
      if (lenderIndex >= 0) {
        return sum + parseFloat(formatEther(loan.lenderAmounts[lenderIndex]));
      }
      return sum;
    }, 0);

    const totalVolume = loans.reduce((sum, loan) => {
      return sum + parseFloat(formatEther(loan.totalAmount));
    }, 0);

    const activeLoans = loans.filter(loan => loan.status === LoanStatus.FUNDED).length;
    const totalLoans = loans.length;

    return { totalBorrowed, totalLent, activeLoans, totalVolume, totalLoans };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-900/30 rounded-lg">
              <TrendingUp className="text-blue-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.totalBorrowed.toFixed(4)}</div>
              <div className="text-sm text-gray-400">Total Borrowed (ETH)</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-900/30 rounded-lg">
              <DollarSign className="text-green-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.totalLent.toFixed(4)}</div>
              <div className="text-sm text-gray-400">Total Lent (ETH)</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-900/30 rounded-lg">
              <Clock className="text-purple-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.activeLoans}</div>
              <div className="text-sm text-gray-400">Active Loans</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-900/30 rounded-lg">
              <BarChart3 className="text-indigo-400" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.totalVolume.toFixed(2)}</div>
              <div className="text-sm text-gray-400">Total Volume (ETH)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <LoanFilter 
        filters={filters}
        onFiltersChange={setFilters}
        onToggleView={() => setFilters(prev => ({ ...prev, viewMode: prev.viewMode === 'grid' ? 'list' : 'grid' }))}
      />

      {/* Tabs and Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Loans
          </button>
          <button
            onClick={() => setActiveTab('borrowed')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'borrowed'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            My Borrowed
          </button>
          <button
            onClick={() => setActiveTab('lent')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'lent'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            My Lent
          </button>
        </div>

        <button
          onClick={loadLoans}
          disabled={isLoading}
          className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className={`${isLoading ? 'animate-spin' : ''}`} size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Results Summary */}
      {processedLoans.length !== loans.length && (
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <p className="text-sm text-gray-400">
            Showing {processedLoans.length} of {loans.length} loans
            {filters.search && ` matching "${filters.search}"`}
          </p>
        </div>
      )}

      {/* Loans Display */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      ) : processedLoans.length > 0 ? (
        filters.viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {processedLoans.map((loan) => (
              <LoanCard key={loan.id} loan={loan} onUpdate={loadLoans} />
            ))}
          </div>
        ) : (
          <LoanListView loans={processedLoans} />
        )
      ) : (
        <div className="text-center py-12">
          <Shield className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No loans found</h3>
          <p className="text-gray-500">
            {(filters.search || filters.amountMin || filters.amountMax || filters.interestRateMin || filters.interestRateMax || filters.durationMin || filters.durationMax)
              ? 'No loans match your current filters. Try adjusting your search criteria.'
              : activeTab === 'all' 
              ? 'No loans available at the moment.'
              : activeTab === 'borrowed'
              ? "You haven't borrowed any loans yet."
              : "You haven't lent any loans yet."
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;