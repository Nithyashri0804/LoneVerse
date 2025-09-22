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

      // Get all active loan requests
      const activeLoanIds = await contract.getActiveLoanRequests();
      
      // Get borrower loans
      const borrowerLoanIds = await contract.getBorrowerLoans(account);
      
      // Get lender loans  
      const lenderLoanIds = await contract.getLenderLoans(account);

      // Combine all unique loan IDs
      const allLoanIds = new Set([
        ...activeLoanIds.map((id: any) => Number(id.toString())),
        ...borrowerLoanIds.map((id: any) => Number(id.toString())),
        ...lenderLoanIds.map((id: any) => Number(id.toString())),
      ]);

      // Fetch loan details
      const loanPromises = Array.from(allLoanIds).map(async (loanId) => {
        const loanData = await contract.getLoan(loanId);
        return {
          id: Number(loanData.id.toString()),
          borrower: loanData.borrower,
          lenders: loanData.lenders,
          lenderAmounts: loanData.lenderAmounts.map((amt: any) => amt.toString()),
          totalAmount: loanData.totalAmount.toString(),
          totalFunded: loanData.totalFunded.toString(),
          loanToken: loanData.loanToken,
          collateralToken: loanData.collateralToken,
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
      setLoans(loadedLoans.sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error('Error loading loans:', error);
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