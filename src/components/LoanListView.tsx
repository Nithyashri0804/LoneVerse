import React from 'react';
import { formatEther } from 'ethers';
import { User, DollarSign, Percent, Clock } from 'lucide-react';
import { Loan, LoanStatus } from '../types/loan';
import { calculateRiskScore, getRiskLevel } from '../utils/loanFilters';

interface LoanListViewProps {
  loans: Loan[];
}

const LoanListView: React.FC<LoanListViewProps> = ({ loans }) => {
  const getStatusColor = (status: LoanStatus) => {
    switch (status) {
      case LoanStatus.REQUESTED:
        return 'text-yellow-400 bg-yellow-900/20';
      case LoanStatus.FUNDED:
        return 'text-blue-400 bg-blue-900/20';
      case LoanStatus.REPAID:
        return 'text-green-400 bg-green-900/20';
      case LoanStatus.DEFAULTED:
        return 'text-red-400 bg-red-900/20';
      default:
        return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getStatusText = (status: LoanStatus) => {
    switch (status) {
      case LoanStatus.REQUESTED:
        return 'Requested';
      case LoanStatus.FUNDED:
        return 'Active';
      case LoanStatus.REPAID:
        return 'Repaid';
      case LoanStatus.DEFAULTED:
        return 'Defaulted';
      default:
        return 'Unknown';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-800 rounded-lg text-sm font-medium text-gray-400 border border-gray-700">
        <div className="col-span-1">ID</div>
        <div className="col-span-2">Amount</div>
        <div className="col-span-1">Rate</div>
        <div className="col-span-2">Borrower</div>
        <div className="col-span-2">Lender</div>
        <div className="col-span-1">Duration</div>
        <div className="col-span-1">Risk</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-1">Created</div>
      </div>

      {/* Loan Rows */}
      {loans.map((loan) => {
        const riskScore = calculateRiskScore(loan);
        const riskLevel = getRiskLevel(riskScore);
        
        return (
          <div 
            key={loan.id}
            className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
          >
            {/* ID */}
            <div className="col-span-1 text-white font-medium">
              #{loan.id}
            </div>

            {/* Amount */}
            <div className="col-span-2 text-white">
              <div className="flex items-center space-x-1">
                <DollarSign size={14} className="text-green-400" />
                <span>{parseFloat(formatEther(loan.amount)).toFixed(4)} ETH</span>
              </div>
            </div>

            {/* Interest Rate */}
            <div className="col-span-1 text-white">
              <div className="flex items-center space-x-1">
                <Percent size={14} className="text-blue-400" />
                <span>{(loan.interestRate / 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* Borrower */}
            <div className="col-span-2 text-gray-300">
              <div className="flex items-center space-x-1">
                <User size={14} className="text-purple-400" />
                <span>{formatAddress(loan.borrower)}</span>
              </div>
            </div>

            {/* Lender */}
            <div className="col-span-2 text-gray-300">
              <div className="flex items-center space-x-1">
                <User size={14} className="text-orange-400" />
                <span>{loan.lender !== '0x0000000000000000000000000000000000000000' 
                  ? formatAddress(loan.lender) 
                  : 'None'}</span>
              </div>
            </div>

            {/* Duration */}
            <div className="col-span-1 text-gray-300">
              <div className="flex items-center space-x-1">
                <Clock size={14} className="text-gray-400" />
                <span>{Math.round(loan.duration / (24 * 60 * 60))}d</span>
              </div>
            </div>

            {/* Risk Score */}
            <div className="col-span-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskLevel.color} ${riskLevel.bgColor}`}>
                {riskScore}
              </span>
            </div>

            {/* Status */}
            <div className="col-span-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                {getStatusText(loan.status)}
              </span>
            </div>

            {/* Created Date */}
            <div className="col-span-1 text-gray-400 text-sm">
              {formatDate(loan.createdAt)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LoanListView;