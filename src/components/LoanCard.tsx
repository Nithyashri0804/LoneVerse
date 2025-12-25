import React, { useState } from 'react';
import { Clock, DollarSign, Shield, User, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import { ethers, formatUnits } from 'ethers';
import { Loan, LoanStatus, TokenType, TOKEN_INFO } from '../types/loan';
import { calculateRiskScore, getRiskLevel } from '../utils/loanFilters';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import PooledLoanFunding from './PooledLoanFunding';

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
    switch (Number(status)) {
      case LoanStatus.REQUESTED:
        return 'Requested';
      case LoanStatus.FUNDED:
        return 'Active';
      case LoanStatus.REPAID:
        return 'Repaid';
      case LoanStatus.DEFAULTED:
        return 'Defaulted';
      case 6: // VOTING
        return 'Voting';
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
    const decimals = TOKEN_INFO[loan.loanToken]?.decimals || 18;
    return parseFloat(formatUnits(repaymentWei, decimals));
  };

  const isExpired = () => {
    return loan.dueDate > 0 && Date.now() / 1000 > loan.dueDate;
  };

  const canFund = () => {
    // Convert BigInt status to number for comparison
    const statusNumber = Number(loan.status);
    const isRequested = statusNumber === LoanStatus.REQUESTED;
    const hasAccount = !!account;
    const isDifferentFromBorrower = account && account.toLowerCase() !== loan.borrower.toLowerCase();
    
    return isRequested && hasAccount && isDifferentFromBorrower;
  };

  const canRepay = () => {
    return Number(loan.status) === LoanStatus.FUNDED && 
           account && account.toLowerCase() === loan.borrower.toLowerCase() &&
           !isExpired();
  };

  const canClaimCollateral = () => {
    return Number(loan.status) === LoanStatus.FUNDED && 
           account && loan.lenders.length > 0 && 
           loan.lenders.some(lender => lender.toLowerCase() === account.toLowerCase()) &&
           isExpired() &&
           !loan.collateralClaimed;
  };

  const handleContribute = async (loanId: number, amount: string) => {
    if (!contract) {
      throw new Error('Contract not initialized');
    }

    try {
      setError('');
      const loanTokenDecimals = TOKEN_INFO[loan.loanToken].decimals;
      const contributionAmount = ethers.parseUnits(amount, loanTokenDecimals);
      const isNativeETH = loan.loanToken === 0; // TokenType.NATIVE_ETH
      
      if (isNativeETH) {
        // For ETH loans, send ETH value with both loanId and amount parameters
        const tx = await contract.contributeLoan(loanId, contributionAmount, {
          value: contributionAmount,
        });
        await tx.wait();
      } else {
        // For ERC20 loans, need token approval first
        const tokenInfo = await contract.supportedTokens(loan.loanToken);
        const tokenAddress = tokenInfo.contractAddress;
        
        if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
          throw new Error('Invalid token address for this token type');
        }

        // Create ERC20 contract instance
        const erc20Contract = new ethers.Contract(
          tokenAddress,
          ['function approve(address spender, uint256 amount) external returns (bool)',
           'function allowance(address owner, address spender) external view returns (uint256)',
           'function balanceOf(address account) external view returns (uint256)',
           'function symbol() external view returns (string)',
           'function faucet(uint256 amount) external'],
          contract.runner
        );

        // Check token balance
        const balance = await erc20Contract.balanceOf(account);
        const contributionAmountBigInt = BigInt(contributionAmount);
        
        if (balance < contributionAmountBigInt) {
          const tokenSymbol = await erc20Contract.symbol();
          const balanceFormatted = ethers.formatUnits(balance, loanTokenDecimals);
          const requiredFormatted = ethers.formatUnits(contributionAmount, loanTokenDecimals);
          throw new Error(
            `Insufficient ${tokenSymbol} balance. You have ${balanceFormatted} ${tokenSymbol} but need ${requiredFormatted} ${tokenSymbol}. ` +
            `If this is a test token, try calling the faucet() function to get test tokens.`
          );
        }

        // Check current allowance
        const contractAddress = await contract.getAddress();
        const currentAllowance = await erc20Contract.allowance(account, contractAddress);
        
        if (currentAllowance < contributionAmountBigInt) {
          // Need to approve first
          console.log('Approving token spend...');
          const approveTx = await erc20Contract.approve(contractAddress, contributionAmountBigInt);
          await approveTx.wait();
          console.log('Token approval confirmed');
        }

        // Now contribute to the loan (no ETH value for ERC20 loans)
        const tx = await contract.contributeLoan(loanId, contributionAmount);
        await tx.wait();
      }

      onUpdate();
    } catch (error: any) {
      console.error('Error contributing to loan:', error);
      throw new Error(error.reason || error.message || 'Failed to contribute to loan');
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
        const { ethers } = await import('ethers');
        
        try {
          const tokenInfo = await contract.supportedTokens(loan.loanToken);
          const tokenAddress = tokenInfo.contractAddress;
          
          if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
            setError('Invalid token address for this token type');
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
          const contractAddress = await contract.getAddress();
          const currentAllowance = await erc20Contract.allowance(account, contractAddress);
          
          if (currentAllowance < repaymentAmount) {
            // Need to approve first
            console.log('Approving token spend for repayment...');
            const approveTx = await erc20Contract.approve(contractAddress, repaymentAmount);
            await approveTx.wait();
            console.log('Token approval confirmed');
          }

          // Now repay the loan (no ETH value for ERC20 loans)
          const tx = await contract.repayLoan(loan.id);
          await tx.wait();
        } catch (tokenError: any) {
          console.error('Error with token operations:', tokenError);
          setError('Failed to get token information or approve token spend for repayment');
          return;
        }
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

  const canLiquidate = () => {
    const statusNumber = Number(loan.status);
    // LoanVerseV4 allows liquidation in FUNDED or VOTING status
    return (statusNumber === LoanStatus.FUNDED || statusNumber === 6 /* VOTING */) &&
           account && account.toLowerCase() !== loan.borrower.toLowerCase() &&
           (isExpired() || (loan.riskScore && loan.riskScore > 800)); // Simplified UI check for liquidation
  };

  const handleLiquidate = async () => {
    if (!contract) return;

    try {
      setIsLoading(true);
      setError('');

      const interest = (BigInt(loan.totalAmount) * BigInt(loan.interestRate)) / BigInt(10000);
      const totalOwed = BigInt(loan.totalAmount) + interest - BigInt(loan.totalRepaid);
      
      const isNativeETH = loan.loanToken === 0;

      if (isNativeETH) {
        const tx = await contract.liquidate(loan.id, {
          value: totalOwed,
        });
        await tx.wait();
      } else {
        // Handle ERC20 approval for liquidation
        const tokenInfo = await contract.supportedTokens(loan.loanToken);
        const tokenAddress = tokenInfo.contractAddress;
        
        const erc20Contract = new ethers.Contract(
          tokenAddress,
          ['function approve(address spender, uint256 amount) external returns (bool)',
           'function allowance(address owner, address spender) external view returns (uint256)'],
          contract.runner
        );

        const contractAddress = await contract.getAddress();
        const currentAllowance = await erc20Contract.allowance(account, contractAddress);
        
        if (currentAllowance < totalOwed) {
          const approveTx = await erc20Contract.approve(contractAddress, totalOwed);
          await approveTx.wait();
        }

        const tx = await contract.liquidate(loan.id);
        await tx.wait();
      }

      onUpdate();
    } catch (error: any) {
      console.error('Error liquidating loan:', error);
      setError(error.reason || error.message || 'Failed to liquidate loan');
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
                {parseFloat(formatUnits(loan.totalAmount, TOKEN_INFO[loan.loanToken]?.decimals || 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {getTokenSymbol(loan.loanToken)}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Shield className="text-blue-400" size={16} />
            <div>
              <div className="text-xs text-gray-400">Collateral</div>
              <div className="text-white font-medium">
                {parseFloat(formatUnits(loan.collateralAmount, TOKEN_INFO[loan.collateralToken]?.decimals || 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {getTokenSymbol(loan.collateralToken)}
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

      {Number(loan.status) === LoanStatus.FUNDED && (
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
              <div className="text-white font-medium">{calculateRepaymentAmountForDisplay().toFixed(4)} {getTokenSymbol(loan.loanToken)}</div>
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

      {/* Pooled Funding Section for REQUESTED loans */}
      {Number(loan.status) === LoanStatus.REQUESTED && account && account.toLowerCase() !== loan.borrower.toLowerCase() && (
        <div className="mb-4">
          <PooledLoanFunding loan={loan} onContribute={handleContribute} />
        </div>
      )}

      <div className="flex space-x-3">

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

        {canLiquidate() && (
          <button
            onClick={handleLiquidate}
            disabled={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <AlertTriangle size={16} />
                <span>Liquidate</span>
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