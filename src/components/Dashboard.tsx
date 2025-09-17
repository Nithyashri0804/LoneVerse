import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Shield, Clock, RefreshCw } from 'lucide-react';
import { formatEther } from 'ethers';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { Loan, LoanStatus } from '../types/loan';
import LoanCard from './LoanCard';

const Dashboard: React.FC = () => {
  const { contract } = useContract();
  const { account } = useWallet();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'borrowed' | 'lent'>('all');

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

  const filteredLoans = loans.filter((loan) => {
    if (!account) return activeTab === 'all';
    
    switch (activeTab) {
      case 'borrowed':
        return loan.borrower.toLowerCase() === account.toLowerCase();
      case 'lent':
        return loan.lender.toLowerCase() === account.toLowerCase();
      default:
        return true;
    }
  });

  const getStats = () => {
    if (!account) {
      return { totalBorrowed: 0, totalLent: 0, activeLoans: 0 };
    }
    
    const borrowedLoans = loans.filter(loan => loan.borrower.toLowerCase() === account.toLowerCase());
    const lentLoans = loans.filter(loan => loan.lender.toLowerCase() === account.toLowerCase());
    
    const totalBorrowed = borrowedLoans.reduce((sum, loan) => {
      return sum + parseFloat(formatEther(loan.amount));
    }, 0);

    const totalLent = lentLoans.reduce((sum, loan) => {
      return sum + parseFloat(formatEther(loan.amount));
    }, 0);

    const activeLoans = loans.filter(loan => loan.status === LoanStatus.FUNDED).length;

    return { totalBorrowed, totalLent, activeLoans };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>

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

      {/* Loans Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      ) : filteredLoans.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLoans.map((loan) => (
            <LoanCard key={loan.id} loan={loan} onUpdate={loadLoans} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Shield className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No loans found</h3>
          <p className="text-gray-500">
            {activeTab === 'all' 
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