import React, { useState } from 'react';
import { Clock, DollarSign, Shield, User, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import { ethers } from 'ethers';
import { Loan, LoanStatus, TokenType, TOKEN_INFO } from '../types/loan';
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

  const getTokenSymbol = (tokenType: TokenType): string => {
    return TOKEN_INFO[tokenType]?.symbol || 'UNKNOWN';
  };

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const riskScore = calculateRiskScore(loan);
  const riskLevel = getRiskLevel(riskScore);

  const calculateRepaymentAmount = () => {
    // Use wei-based integer arithmetic for precision
    const amountWei = BigInt(loan.totalAmount);
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
    const isRequested = loan.status === LoanStatus.REQUESTED;
    const hasAccount = !!account;
    const isDifferentFromBorrower = account && account.toLowerCase() !== loan.borrower.toLowerCase();
    
    // Debug logging
    console.log('🔍 Fund Loan Debug:', {
      loanId: loan.id,
      loanStatus: loan.status,
      isRequestedStatus: isRequested,
      account: account,
      hasAccount: hasAccount,
      borrower: loan.borrower,
      isDifferentFromBorrower: isDifferentFromBorrower,
      canFund: isRequested && hasAccount && isDifferentFromBorrower
    });
    
    return isRequested && hasAccount && isDifferentFromBorrower;
  };

  const canRepay = () => {
    return loan.status === LoanStatus.FUNDED && 
           account && account.toLowerCase() === loan.borrower.toLowerCase() &&
           !isExpired();
  };

  const canClaimCollateral = () => {
    return loan.status === LoanStatus.FUNDED && 
           account && loan.lenders.length > 0 && 
           loan.lenders.some(lender => lender.toLowerCase() === account.toLowerCase()) &&
           isExpired() &&
           !loan.collateralClaimed;
  };

  const handleFundLoan = async () => {
    if (!contract) return;

    try {
      setIsLoading(true);
      setError('');

      const isNativeETH = loan.loanToken === 0; // TokenType.NATIVE_ETH
      const fundingAmount = loan.totalAmount; // Fund the full amount
      
      if (isNativeETH) {
        // For ETH loans, send ETH value with both loanId and amount parameters
        const tx = await contract.fundLoan(loan.id, fundingAmount, {
          value: fundingAmount,
        });
        await tx.wait();
      } else {
        // For ERC20 loans, need token approval first
        const { ethers } = await import('ethers');
        const tokenAddress = await getTokenAddress(loan.loanToken);
        
        if (!tokenAddress) {
          setError('Token address not found for this token type');
          return;
        }

        // Create ERC20 contract instance
        const erc20Contract = new ethers.Contract(
          tokenAddress,
          ['function approve(address spender, uint256 amount) external returns (bool)',
           'function allowance(address owner, address spender) external view returns (uint256)'],
          contract.runner
        );

        // Check current allowance
        const currentAllowance = await erc20Contract.allowance(account, await contract.getAddress());
        
        if (currentAllowance < fundingAmount) {
          // Need to approve first
          console.log('Approving token spend...');
          const approveTx = await erc20Contract.approve(await contract.getAddress(), fundingAmount);
          await approveTx.wait();
          console.log('Token approval confirmed');
        }

        // Now fund the loan
        const tx = await contract.fundLoan(loan.id, fundingAmount);
        await tx.wait();
      }

      onUpdate();
    } catch (error: any) {
      console.error('Error funding loan:', error);
      setError(error.reason || error.message || 'Failed to fund loan');
    } finally {
      setIsLoading(false);
    }
  };

  const getTokenAddress = async (tokenType: TokenType): Promise<string | null> => {
    try {
      const tokenInfo = await contract.getSupportedToken(tokenType);
      return tokenInfo.contractAddress;
    } catch (error) {
      console.error('Error getting token address:', error);
      return null;
    }
  };

  const handleRepayLoan = async () => {
    if (!contract) return;

    try {
      setIsLoading(true);
      setError('');

      const repaymentAmount = calculateRepaymentAmount();
      const isNativeETH = loan.loanToken === 0; // TokenType.NATIVE_ETH
      
      if (isNativeETH) {
        // For ETH loans, send ETH value
        const tx = await contract.repayLoan(loan.id, {
          value: repaymentAmount,
        });
        await tx.wait();
      } else {
        // For ERC20 loans, need token approval first
        // TODO: Implement ERC20 approval and transfer
        setError('ERC20 token repayment not yet implemented. Please use ETH loans for now.');
        return;
      }

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
                {parseFloat(ethers.formatEther(loan.totalAmount)).toFixed(4)} {getTokenSymbol(loan.loanToken)}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Shield className="text-blue-400" size={16} />
            <div>
              <div className="text-xs text-gray-400">Collateral</div>
              <div className="text-white font-medium">
                {parseFloat(ethers.formatEther(loan.collateralAmount)).toFixed(4)} {getTokenSymbol(loan.collateralToken)}
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

          {loan.lenders.length > 0 && (
            <div className="flex items-center space-x-2">
              <User className="text-cyan-400" size={16} />
              <div>
                <div className="text-xs text-gray-400">{loan.lenders.length > 1 ? 'Lenders' : 'Lender'}</div>
                <div className="text-white font-medium">
                  {loan.lenders.length === 1 
                    ? formatAddress(loan.lenders[0])
                    : `${loan.lenders.length} lenders`
                  }
                </div>
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