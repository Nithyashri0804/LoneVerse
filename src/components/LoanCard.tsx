import React, { useState } from 'react';
import { Clock, DollarSign, Shield, User, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import { ethers } from 'ethers';
import { Loan, LoanStatus } from '../types/loan';
import { calculateRiskScore, getRiskLevel } from '../utils/loanFilters';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';

interface LoanCardProps {
  loan: Loan;
  onUpdate: () => void;
}

const LoanCard: React.FC<LoanCardProps> = ({ loan, onUpdate }) => {
  const { contract } = useContract();
  const { account } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

  const riskScore = calculateRiskScore(loan);
  const riskLevel = getRiskLevel(riskScore);

  const calculateRepaymentAmount = () => {
    // Use wei-based integer arithmetic for precision
    const amountWei = BigInt(loan.amount);
    const interestWei = (amountWei * BigInt(loan.interestRate)) / BigInt(10000);
    return amountWei + interestWei;
  };

  const calculateRepaymentAmountForDisplay = () => {
    const repaymentWei = calculateRepaymentAmount();
    return parseFloat(ethers.formatEther(repaymentWei));
  };

  const isExpired = () => {
    return loan.dueDate > 0 && Date.now() / 1000 > loan.dueDate;
  };

  const canFund = () => {
    return loan.status === LoanStatus.REQUESTED && 
           account && account.toLowerCase() !== loan.borrower.toLowerCase();
  };

  const canRepay = () => {
    return loan.status === LoanStatus.FUNDED && 
           account && account.toLowerCase() === loan.borrower.toLowerCase() &&
           !isExpired();
  };

  const canClaimCollateral = () => {
    return loan.status === LoanStatus.FUNDED && 
           account && account.toLowerCase() === loan.lender.toLowerCase() &&
           isExpired() &&
           !loan.collateralClaimed;
  };

  const handleFundLoan = async () => {
    if (!contract) return;

    try {
      setIsLoading(true);
      setError('');

      const tx = await contract.fundLoan(loan.id, {
        value: loan.amount,
      });

      await tx.wait();
      onUpdate();
    } catch (error: any) {
      console.error('Error funding loan:', error);
      setError(error.reason || error.message || 'Failed to fund loan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepayLoan = async () => {
    if (!contract) return;

    try {
      setIsLoading(true);
      setError('');

      const repaymentAmount = calculateRepaymentAmount();
      const tx = await contract.repayLoan(loan.id, {
        value: repaymentAmount,
      });

      await tx.wait();
      onUpdate();
    } catch (error: any) {
      console.error('Error repaying loan:', error);
      setError(error.reason || error.message || 'Failed to repay loan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimCollateral = async () => {
    if (!contract) return;

    try {
      setIsLoading(true);
      setError('');

      const tx = await contract.claimCollateral(loan.id);
      await tx.wait();
      onUpdate();
    } catch (error: any) {
      console.error('Error claiming collateral:', error);
      setError(error.reason || error.message || 'Failed to claim collateral');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-bold text-white">Loan #{loan.id}</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
            {getStatusText(loan.status)}
          </span>
        </div>
        {isExpired() && loan.status === LoanStatus.FUNDED && (
          <div className="flex items-center space-x-1 text-red-400">
            <AlertTriangle size={16} />
            <span className="text-xs">Expired</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <DollarSign className="text-green-400" size={16} />
            <div>
              <div className="text-xs text-gray-400">Loan Amount</div>
              <div className="text-white font-medium">
                {parseFloat(ethers.formatEther(loan.amount)).toFixed(4)} ETH
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Shield className="text-blue-400" size={16} />
            <div>
              <div className="text-xs text-gray-400">Collateral</div>
              <div className="text-white font-medium">
                {parseFloat(ethers.formatEther(loan.collateral)).toFixed(4)} ETH
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <TrendingUp className="text-purple-400" size={16} />
            <div>
              <div className="text-xs text-gray-400">Interest Rate</div>
              <div className="text-white font-medium">{loan.interestRate / 100}%</div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Shield className="text-yellow-400" size={16} />
            <div>
              <div className="text-xs text-gray-400">Risk Score</div>
              <div className={`font-medium ${riskLevel.color}`}>
                {riskScore} - {riskLevel.level}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <User className="text-orange-400" size={16} />
            <div>
              <div className="text-xs text-gray-400">Borrower</div>
              <div className="text-white font-medium">{formatAddress(loan.borrower)}</div>
            </div>
          </div>

          {loan.lender !== ethers.ZeroAddress && (
            <div className="flex items-center space-x-2">
              <User className="text-cyan-400" size={16} />
              <div>
                <div className="text-xs text-gray-400">Lender</div>
                <div className="text-white font-medium">{formatAddress(loan.lender)}</div>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Calendar className="text-yellow-400" size={16} />
            <div>
              <div className="text-xs text-gray-400">Duration</div>
              <div className="text-white font-medium">{Math.floor(loan.duration / (24 * 60 * 60))} days</div>
            </div>
          </div>
        </div>
      </div>

      {loan.status === LoanStatus.FUNDED && (
        <div className="bg-gray-700 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="text-blue-400" size={16} />
            <span className="text-sm font-medium text-white">Repayment Details</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Due Date:</span>
              <div className="text-white">{formatDate(loan.dueDate)}</div>
            </div>
            <div>
              <span className="text-gray-400">Total Repayment:</span>
              <div className="text-white font-medium">{calculateRepaymentAmountForDisplay().toFixed(4)} ETH</div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertTriangle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        {canFund() && (
          <button
            onClick={handleFundLoan}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <DollarSign size={16} />
                <span>Fund Loan</span>
              </>
            )}
          </button>
        )}

        {canRepay() && (
          <button
            onClick={handleRepayLoan}
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <DollarSign size={16} />
                <span>Repay Loan</span>
              </>
            )}
          </button>
        )}

        {canClaimCollateral() && (
          <button
            onClick={handleClaimCollateral}
            disabled={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Shield size={16} />
                <span>Claim Collateral</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default LoanCard;