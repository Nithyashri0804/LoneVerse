import React, { useState } from 'react';
import { Users, Clock, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import { formatEther } from 'ethers';
import { Loan } from '../types/loan';

interface PooledLoanFundingProps {
  loan: Loan;
  onContribute: (loanId: number, amount: string) => Promise<void>;
}

const PooledLoanFunding: React.FC<PooledLoanFundingProps> = ({ loan, onContribute }) => {
  const [contributionAmount, setContributionAmount] = useState('');
  const [isContributing, setIsContributing] = useState(false);
  const [error, setError] = useState('');

  // Convert BigNumber strings to ETH for calculations
  const totalAmountETH = parseFloat(formatEther(loan.totalAmount));
  const totalFundedETH = parseFloat(formatEther(loan.totalFunded));
  const minContributionETH = parseFloat(formatEther(loan.minContribution || '0'));
  
  const fundingProgress = (totalFundedETH / totalAmountETH) * 100;
  const remainingAmountETH = totalAmountETH - totalFundedETH;
  const timeRemaining = loan.fundingDeadline ? loan.fundingDeadline - Date.now() / 1000 : 0;
  const daysRemaining = Math.floor(timeRemaining / (24 * 60 * 60));
  const hoursRemaining = Math.floor((timeRemaining % (24 * 60 * 60)) / (60 * 60));

  const handleContribute = async () => {
    if (!contributionAmount) {
      setError('Please enter a contribution amount');
      return;
    }

    const amount = parseFloat(contributionAmount);
    if (amount < minContributionETH) {
      setError(`Minimum contribution is ${minContributionETH.toFixed(4)} ETH`);
      return;
    }

    if (amount > remainingAmountETH) {
      setError(`Maximum contribution is ${remainingAmountETH.toFixed(4)} ETH`);
      return;
    }

    // Check if remaining amount after contribution would be below minimum
    if (remainingAmountETH - amount > 0 && remainingAmountETH - amount < minContributionETH) {
      setError(`Would leave ${(remainingAmountETH - amount).toFixed(4)} ETH below minimum for others`);
      return;
    }

    try {
      setIsContributing(true);
      setError('');
      await onContribute(loan.id, contributionAmount);
      setContributionAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to contribute');
    } finally {
      setIsContributing(false);
    }
  };

  const formatTimeRemaining = () => {
    if (timeRemaining <= 0) return 'Expired';
    if (daysRemaining > 0) return `${daysRemaining}d ${hoursRemaining}h`;
    return `${hoursRemaining}h`;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="text-blue-400" size={20} />
          Pooled Funding Progress
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="text-gray-400" size={16} />
          <span className={`${timeRemaining > 86400 ? 'text-green-400' : 'text-orange-400'}`}>
            {formatTimeRemaining()} left
          </span>
        </div>
      </div>

      {/* Funding Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Funded</span>
          <span className="text-white font-medium">
            {formatEther(loan.totalFunded)} / {formatEther(loan.totalAmount)} ETH
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              fundingProgress >= 100
                ? 'bg-green-500'
                : fundingProgress >= 75
                ? 'bg-blue-500'
                : fundingProgress >= 50
                ? 'bg-yellow-500'
                : 'bg-orange-500'
            }`}
            style={{ width: `${Math.min(fundingProgress, 100)}%` }}
          />
        </div>
        <div className="text-sm text-gray-400 mt-1">
          {fundingProgress.toFixed(1)}% funded
        </div>
      </div>

      {/* Funding Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Lenders</div>
          <div className="text-lg font-semibold text-white flex items-center gap-1">
            <Users size={16} className="text-blue-400" />
            {loan.lenders.length}
          </div>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Remaining</div>
          <div className="text-lg font-semibold text-white">
            {remainingAmountETH.toFixed(4)} ETH
          </div>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Min. Contrib.</div>
          <div className="text-lg font-semibold text-white">
            {minContributionETH.toFixed(4)} ETH
          </div>
        </div>
      </div>

      {/* Lenders List */}
      {loan.lenders.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Current Lenders</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {loan.lenders.map((lender, index) => {
              const lenderAmount = loan.lenderAmounts[index];
              const lenderAmountETH = parseFloat(formatEther(lenderAmount));
              const lenderPercentage = (lenderAmountETH / totalAmountETH) * 100;
              return (
                <div key={index} className="bg-gray-700/30 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm text-white font-mono">
                        {lender.slice(0, 6)}...{lender.slice(-4)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {lenderPercentage.toFixed(1)}% of loan
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {lenderAmountETH.toFixed(4)} ETH
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contribution Form */}
      {fundingProgress < 100 && timeRemaining > 0 && (
        <div className="border-t border-gray-700 pt-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Contribute to this Loan</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-400">Your Contribution (ETH)</label>
                <button
                  onClick={() => setContributionAmount(remainingAmountETH.toFixed(4))}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Fund Remaining
                </button>
              </div>
              <input
                type="number"
                step="0.001"
                min={minContributionETH}
                max={remainingAmountETH}
                value={contributionAmount}
                onChange={(e) => {
                  setContributionAmount(e.target.value);
                  setError('');
                }}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Min: ${minContributionETH.toFixed(4)}`}
              />
            </div>

            {contributionAmount && (
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <TrendingUp size={14} />
                  <span className="font-medium">Your Expected Returns</span>
                </div>
                <div className="space-y-1 text-gray-300">
                  <div className="flex justify-between">
                    <span>Your Contribution:</span>
                    <span className="font-medium">{contributionAmount} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interest ({loan.interestRate / 100}%):</span>
                    <span className="font-medium">
                      {(parseFloat(contributionAmount) * loan.interestRate / 10000).toFixed(4)} ETH
                    </span>
                  </div>
                  <div className="flex justify-between text-white font-semibold border-t border-gray-700 pt-1 mt-1">
                    <span>Total Return:</span>
                    <span>
                      {(parseFloat(contributionAmount) * (1 + loan.interestRate / 10000)).toFixed(4)} ETH
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-400 bg-red-900/20 rounded-lg p-3 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleContribute}
              disabled={isContributing || !contributionAmount}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isContributing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Contributing...</span>
                </>
              ) : (
                <>
                  <DollarSign size={16} />
                  <span>Contribute to Loan</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Fully Funded Message */}
      {fundingProgress >= 100 && (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 text-center">
          <div className="text-green-400 font-medium mb-1">Fully Funded!</div>
          <div className="text-sm text-gray-300">
            This loan has been fully funded by {loan.lenders.length} lender{loan.lenders.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Expired Message */}
      {timeRemaining <= 0 && fundingProgress < 100 && (
        <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4 text-center">
          <div className="text-orange-400 font-medium mb-1">Funding Period Expired</div>
          <div className="text-sm text-gray-300">
            This loan did not reach its funding goal and contributions will be refunded
          </div>
        </div>
      )}
    </div>
  );
};

export default PooledLoanFunding;
