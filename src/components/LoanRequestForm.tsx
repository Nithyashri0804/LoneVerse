import React, { useState } from 'react';
import { PlusCircle, AlertCircle, Calculator } from 'lucide-react';
import { parseEther } from 'ethers';
import { useContract } from '../hooks/useContract';
import { LoanFormData } from '../types/loan';

interface LoanRequestFormProps {
  onSuccess: () => void;
}

const LoanRequestForm: React.FC<LoanRequestFormProps> = ({ onSuccess }) => {
  const { contract } = useContract();
  const [formData, setFormData] = useState<LoanFormData>({
    totalAmount: '',
    loanToken: 0, // NATIVE_ETH
    collateralToken: 0, // NATIVE_ETH
    collateralAmount: '',
    interestRate: 5,
    duration: 30,
    isVariableRate: false,
    hasInsurance: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const calculateRequiredCollateral = () => {
    if (!formData.totalAmount) return '0';
    const amount = parseFloat(formData.totalAmount);
    return (amount * 1.2).toFixed(4); // 120% collateralization for V2 contract
  };

  const calculateTotalRepayment = () => {
    if (!formData.totalAmount) return '0';
    const amount = parseFloat(formData.totalAmount);
    const interest = (amount * formData.interestRate) / 100;
    return (amount + interest).toFixed(4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) {
      setError('Contract not initialized');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const loanAmount = parseEther(formData.totalAmount);
      const collateralAmount = parseEther(formData.collateralAmount);
      const interestRateBasisPoints = formData.interestRate * 100; // Convert to basis points
      const durationSeconds = formData.duration * 24 * 60 * 60; // Convert days to seconds
      const loanToken = formData.loanToken; // 0 = NATIVE_ETH
      const hasInsurance = formData.hasInsurance;

      // Calculate required ETH based on contract logic
      const collateralToken = formData.collateralToken; // 0 = NATIVE_ETH
      const insuranceFee = hasInsurance ? loanAmount * BigInt(100) / BigInt(10000) : BigInt(0);

      // Function arguments for requestLoan
      const args = [
        loanAmount,              // _totalAmount
        loanToken,               // _loanToken (NATIVE_ETH = 0)
        collateralToken,         // _collateralToken (NATIVE_ETH = 0)  
        collateralAmount,        // _collateralAmount
        interestRateBasisPoints, // _interestRate
        durationSeconds,         // _duration
        formData.isVariableRate, // _isVariableRate
        hasInsurance,            // _hasInsurance
      ];

      // Calculate exact ETH value based on contract requirements
      let ethValue: bigint;
      if (collateralToken === 0) { // NATIVE_ETH collateral
        ethValue = collateralAmount;
        if (hasInsurance && loanToken === 0) { // Insurance fee only if loan is also ETH
          ethValue += insuranceFee;
        }
      } else { // ERC20 collateral
        if (hasInsurance && loanToken === 0) { // Insurance fee only if loan is ETH
          ethValue = insuranceFee;
        } else {
          ethValue = BigInt(0); // No ETH should be sent
        }
      }

      console.log(`💰 Calculated ETH value: ${ethValue.toString()} wei`);
      console.log(`📋 Loan details:`, {
        loanAmount: loanAmount.toString(),
        collateralAmount: collateralAmount.toString(),
        loanToken,
        collateralToken,
        hasInsurance,
        insuranceFee: insuranceFee.toString()
      });

      // Estimate gas with the correct ETH value
      let gasEstimate: any;
      try {
        gasEstimate = await contract.requestLoan.estimateGas(...args, { value: ethValue });
        console.log('✅ Gas estimation successful:', gasEstimate.toString());
      } catch (error: any) {
        console.error('❌ Gas estimation failed:', error);
        // Try to get the revert reason
        try {
          await contract.requestLoan.staticCall(...args, { value: ethValue });
          throw new Error('Gas estimation failed but static call succeeded');
        } catch (staticError: any) {
          const revertReason = staticError.reason || staticError.shortMessage || staticError.message || 'Unknown contract error';
          throw new Error(`Contract validation failed: ${revertReason}`);
        }
      }

      // Add 25% safety margin to gas estimate
      const gasLimit = gasEstimate * BigInt(125) / BigInt(100);

      console.log(`🚀 Sending transaction with gas limit: ${gasLimit.toString()}, ETH value: ${ethValue.toString()}`);

      // Send the transaction with proper gas limit and ETH value
      const tx = await contract.requestLoan(...args, { 
        value: ethValue,
        gasLimit: gasLimit
      });

      await tx.wait();
      onSuccess();
      
      // Reset form
      setFormData({
        totalAmount: '',
        loanToken: 0,
        collateralToken: 0,
        collateralAmount: '',
        interestRate: 5,
        duration: 30,
        isVariableRate: false,
        hasInsurance: false,
      });
    } catch (error: any) {
      console.error('Error requesting loan:', error);
      // Enhanced error messages
      const errorMessage = error.shortMessage || error.reason || error.message || 'Failed to request loan';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoanFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center space-x-2 mb-6">
        <PlusCircle className="text-blue-400" size={24} />
        <h2 className="text-xl font-bold text-white">Request a Loan</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Loan Amount
          </label>
          <div className="flex space-x-3">
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={formData.totalAmount}
              onChange={(e) => handleInputChange('totalAmount', e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.0000"
              required
            />
            <select
              value={formData.loanToken}
              onChange={(e) => handleInputChange('loanToken', parseInt(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>ETH</option>
              <option value={1}>USDC</option>
              <option value={2}>DAI</option>
              <option value={3}>USDT</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Interest Rate (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            max="20"
            value={formData.interestRate}
            onChange={(e) => handleInputChange('interestRate', parseFloat(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Duration (Days)
          </label>
          <select
            value={formData.duration}
            onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>365 days</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Collateral Amount (ETH)
          </label>
          <input
            type="number"
            step="0.0001"
            min="0.0001"
            value={formData.collateralAmount}
            onChange={(e) => handleInputChange('collateralAmount', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.0000"
            required
          />
          <div className="mt-2 text-sm text-gray-400">
            Minimum required: {calculateRequiredCollateral()} ETH (120% of loan amount)
          </div>
        </div>

        {formData.totalAmount && (
          <div className="bg-gray-700 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2 text-blue-400 mb-2">
              <Calculator size={16} />
              <span className="font-medium">Loan Summary</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Loan Amount:</span>
                <div className="text-white font-medium">{formData.totalAmount} ETH</div>
              </div>
              <div>
                <span className="text-gray-400">Total Repayment:</span>
                <div className="text-white font-medium">{calculateTotalRepayment()} ETH</div>
              </div>
              <div>
                <span className="text-gray-400">Interest:</span>
                <div className="text-white font-medium">{formData.interestRate}%</div>
              </div>
              <div>
                <span className="text-gray-400">Duration:</span>
                <div className="text-white font-medium">{formData.duration} days</div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 text-red-400 bg-red-900/20 rounded-lg p-3">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !contract}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Requesting Loan...</span>
            </>
          ) : (
            <>
              <PlusCircle size={16} />
              <span>Request Loan</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default LoanRequestForm;