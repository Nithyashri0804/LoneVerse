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
    amount: '',
    interestRate: 5,
    duration: 30,
    collateral: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const calculateRequiredCollateral = () => {
    if (!formData.amount) return '0';
    const amount = parseFloat(formData.amount);
    return (amount * 1.5).toFixed(4); // 150% collateralization
  };

  const calculateTotalRepayment = () => {
    if (!formData.amount) return '0';
    const amount = parseFloat(formData.amount);
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

      const loanAmount = parseEther(formData.amount);
      const collateralAmount = parseEther(formData.collateral);
      const interestRateBasisPoints = formData.interestRate * 100; // Convert to basis points
      const durationSeconds = formData.duration * 24 * 60 * 60; // Convert days to seconds

      const tx = await contract.requestLoan(
        loanAmount,
        interestRateBasisPoints,
        durationSeconds,
        { value: collateralAmount }
      );

      await tx.wait();
      onSuccess();
      
      // Reset form
      setFormData({
        amount: '',
        interestRate: 5,
        duration: 30,
        collateral: '',
      });
    } catch (error: any) {
      console.error('Error requesting loan:', error);
      setError(error.reason || error.message || 'Failed to request loan');
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
            Loan Amount (ETH)
          </label>
          <input
            type="number"
            step="0.0001"
            min="0.0001"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.0000"
            required
          />
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
            value={formData.collateral}
            onChange={(e) => handleInputChange('collateral', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.0000"
            required
          />
          <div className="mt-2 text-sm text-gray-400">
            Minimum required: {calculateRequiredCollateral()} ETH (150% of loan amount)
          </div>
        </div>

        {formData.amount && (
          <div className="bg-gray-700 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2 text-blue-400 mb-2">
              <Calculator size={16} />
              <span className="font-medium">Loan Summary</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Loan Amount:</span>
                <div className="text-white font-medium">{formData.amount} ETH</div>
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