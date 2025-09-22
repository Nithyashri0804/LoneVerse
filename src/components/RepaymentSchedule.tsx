import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle, DollarSign, TrendingUp } from 'lucide-react';
import { formatEther } from 'ethers';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { Loan, LoanStatus, TOKEN_INFO } from '../types/loan';

interface RepaymentScheduleItem {
  loan: Loan;
  daysUntilDue: number;
  isOverdue: boolean;
  repaymentAmount: string;
  status: 'upcoming' | 'due-soon' | 'overdue' | 'completed';
}

const RepaymentSchedule: React.FC = () => {
  const { contract } = useContract();
  const { account } = useWallet();
  const [schedule, setSchedule] = useState<RepaymentScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue' | 'completed'>('all');

  const loadRepaymentSchedule = async () => {
    if (!contract || !account) return;

    try {
      setIsLoading(true);

      // Get borrower's loans
      const borrowerLoanIds = await contract.borrowerLoans(account);
      
      // Get lender's loans for portfolio tracking
      const lenderLoanIds = await contract.lenderLoans(account);
      
      // Combine for full schedule view
      const allLoanIds = new Set([
        ...borrowerLoanIds.map((id: any) => Number(id.toString())),
        ...lenderLoanIds.map((id: any) => Number(id.toString()))
      ]);

      const schedulePromises = Array.from(allLoanIds).map(async (loanId) => {
        const loanData = await contract.getLoan(loanId);
        
        const loan: Loan = {
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
        };

        // Calculate repayment details
        const now = Date.now() / 1000;
        const daysUntilDue = loan.dueDate > 0 ? Math.ceil((loan.dueDate - now) / (24 * 60 * 60)) : 0;
        const isOverdue = loan.dueDate > 0 && now > loan.dueDate;
        
        // Calculate total repayment amount
        const amountWei = BigInt(loan.totalAmount);
        const interestWei = (amountWei * BigInt(loan.interestRate)) / BigInt(10000);
        const repaymentAmount = formatEther(amountWei + interestWei);

        // Determine status
        let status: 'upcoming' | 'due-soon' | 'overdue' | 'completed';
        if (loan.status === LoanStatus.REPAID) {
          status = 'completed';
        } else if (isOverdue) {
          status = 'overdue';
        } else if (daysUntilDue <= 7) {
          status = 'due-soon';
        } else {
          status = 'upcoming';
        }

        return {
          loan,
          daysUntilDue,
          isOverdue,
          repaymentAmount,
          status
        } as RepaymentScheduleItem;
      });

      const scheduleItems = await Promise.all(schedulePromises);
      
      // Sort by due date (soonest first, completed last)
      const sortedSchedule = scheduleItems.sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (b.status === 'completed' && a.status !== 'completed') return -1;
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (b.status === 'overdue' && a.status !== 'overdue') return 1;
        return a.loan.dueDate - b.loan.dueDate;
      });

      setSchedule(sortedSchedule);
    } catch (error) {
      console.error('Error loading repayment schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRepaymentSchedule();
  }, [contract, account]);

  const getFilteredSchedule = () => {
    return schedule.filter(item => {
      if (filter === 'all') return true;
      return item.status === filter;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-900/20';
      case 'upcoming':
        return 'text-blue-400 bg-blue-900/20';
      case 'due-soon':
        return 'text-yellow-400 bg-yellow-900/20';
      case 'overdue':
        return 'text-red-400 bg-red-900/20';
      default:
        return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'upcoming':
        return <Clock size={16} className="text-blue-400" />;
      case 'due-soon':
        return <AlertTriangle size={16} className="text-yellow-400" />;
      case 'overdue':
        return <AlertTriangle size={16} className="text-red-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTokenSymbol = (tokenType: number): string => {
    return TOKEN_INFO[tokenType]?.symbol || 'UNKNOWN';
  };

  const filteredSchedule = getFilteredSchedule();
  const stats = {
    total: schedule.length,
    upcoming: schedule.filter(s => s.status === 'upcoming').length,
    dueSoon: schedule.filter(s => s.status === 'due-soon').length,
    overdue: schedule.filter(s => s.status === 'overdue').length,
    completed: schedule.filter(s => s.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Calendar className="text-blue-400" size={24} />
        <h2 className="text-2xl font-bold text-white">Repayment Schedule</h2>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-gray-400">Total Loans</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400">{stats.upcoming}</div>
            <div className="text-sm text-gray-400">Upcoming</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-400">{stats.dueSoon}</div>
            <div className="text-sm text-gray-400">Due Soon</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-center">
            <div className="text-xl font-bold text-red-400">{stats.overdue}</div>
            <div className="text-sm text-gray-400">Overdue</div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-center">
            <div className="text-xl font-bold text-green-400">{stats.completed}</div>
            <div className="text-sm text-gray-400">Completed</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 border border-gray-700">
        {[
          { key: 'all', label: 'All' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'due-soon', label: 'Due Soon' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'completed', label: 'Completed' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Schedule List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading repayment schedule...</p>
          </div>
        ) : filteredSchedule.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="text-gray-600 mx-auto mb-2" size={48} />
            <p className="text-gray-400">No loans found for the selected filter.</p>
          </div>
        ) : (
          filteredSchedule.map((item) => (
            <div
              key={item.loan.id}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold text-white">Loan #{item.loan.id}</span>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    <span className="capitalize">{item.status.replace('-', ' ')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">
                    {item.status === 'completed' 
                      ? 'Completed' 
                      : item.isOverdue 
                        ? `${Math.abs(item.daysUntilDue)} days overdue`
                        : `${item.daysUntilDue} days until due`
                    }
                  </div>
                  <div className="text-xs text-gray-500">Due: {formatDate(item.loan.dueDate)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="text-green-400" size={16} />
                  <div>
                    <div className="text-xs text-gray-400">Loan Amount</div>
                    <div className="text-white font-medium">
                      {parseFloat(formatEther(item.loan.totalAmount)).toFixed(4)} {getTokenSymbol(item.loan.loanToken)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <TrendingUp className="text-blue-400" size={16} />
                  <div>
                    <div className="text-xs text-gray-400">Repayment Amount</div>
                    <div className="text-white font-medium">
                      {parseFloat(item.repaymentAmount).toFixed(4)} {getTokenSymbol(item.loan.loanToken)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div>
                    <div className="text-xs text-gray-400">Interest Rate</div>
                    <div className="text-white font-medium">{item.loan.interestRate / 100}%</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div>
                    <div className="text-xs text-gray-400">
                      {item.loan.borrower.toLowerCase() === account?.toLowerCase() ? 'Lender' : 'Borrower'}
                    </div>
                    <div className="text-white font-medium">
                      {item.loan.borrower.toLowerCase() === account?.toLowerCase() 
                        ? item.loan.lenders.length > 0 
                          ? formatAddress(item.loan.lenders[0])
                          : 'Not funded'
                        : formatAddress(item.loan.borrower)
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RepaymentSchedule;