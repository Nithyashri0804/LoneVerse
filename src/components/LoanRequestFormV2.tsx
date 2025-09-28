import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Calculator, Shield, TrendingUp, Upload } from 'lucide-react';
import { TokenType, LoanFormData, TOKEN_INFO } from '../types/loan';
import TokenSelector from './TokenSelector';
import IPFSDocumentUpload from './IPFSDocumentUpload';

interface LoanRequestFormV2Props {
  onSubmit: (loanData: LoanFormData) => void;
  isSubmitting: boolean;
}

const LoanRequestFormV2: React.FC<LoanRequestFormV2Props> = ({ onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState<LoanFormData>({
    totalAmount: '',
    loanToken: TokenType.NATIVE_ETH,
    collateralToken: TokenType.NATIVE_ETH,
    collateralAmount: '',
    interestRate: 5,
    duration: 30,
    isVariableRate: false,
    hasInsurance: false,
  });

  const [calculatedCollateral, setCalculatedCollateral] = useState('');
  const [crossCollateralEnabled, setCrossCollateralEnabled] = useState(false);
  const [collateralDocuments, setCollateralDocuments] = useState<{ name: string; ipfsHash: string }[]>([]);

  // Calculate required collateral when loan amount or tokens change
  useEffect(() => {
    if (formData.totalAmount && parseFloat(formData.totalAmount) > 0) {
      const loanAmount = parseFloat(formData.totalAmount);
      
      // Cross-collateral calculation (simplified with mock prices)
      if (formData.loanToken !== formData.collateralToken) {
        // For cross-collateral, use 120% ratio (as per contract)
        const requiredCollateral = calculateCrossCollateral(
          loanAmount,
          formData.loanToken,
          formData.collateralToken
        );
        // Use appropriate decimal places for the collateral token
        const collateralTokenInfo = TOKEN_INFO[formData.collateralToken];
        const decimalPlaces = Math.min(collateralTokenInfo.decimals, 8); // Max 8 decimal places for display
        setCalculatedCollateral(Number(requiredCollateral.toFixed(decimalPlaces)).toString());
        setCrossCollateralEnabled(true);
      } else {
        // Same token collateral - 120% ratio (contract uses 120% for all)
        const requiredCollateral = loanAmount * 1.2;
        const loanTokenInfo = TOKEN_INFO[formData.loanToken];
        const decimalPlaces = Math.min(loanTokenInfo.decimals, 8); // Max 8 decimal places for display
        setCalculatedCollateral(Number(requiredCollateral.toFixed(decimalPlaces)).toString());
        setCrossCollateralEnabled(false);
      }
    }
  }, [formData.totalAmount, formData.loanToken, formData.collateralToken]);

  const calculateCrossCollateral = (loanAmount: number, loanToken: TokenType, collateralToken: TokenType) => {
    // Mock price calculation for demo
    const prices: Record<TokenType, number> = {
      [TokenType.NATIVE_ETH]: 2500,
      [TokenType.USDC]: 1,
      [TokenType.DAI]: 1,
      [TokenType.USDT]: 1,
      [TokenType.GOVERNANCE_TOKEN]: 0,
    };

    const loanValueUSD = loanAmount * prices[loanToken];
    const requiredCollateralUSD = loanValueUSD * 1.2; // 120% collateralization (contract requirement)
    
    return requiredCollateralUSD / prices[collateralToken];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      alert('Please enter a valid loan amount');
      return;
    }
    
    if (!formData.collateralAmount || parseFloat(formData.collateralAmount) <= 0) {
      alert('Please enter a valid collateral amount');
      return;
    }

    try {
      // Convert amounts to proper decimal format
      const loanTokenInfo = TOKEN_INFO[formData.loanToken];
      const collateralTokenInfo = TOKEN_INFO[formData.collateralToken];
      
      // Fix floating point precision issues by parsing and reformatting
      const loanAmountFloat = parseFloat(formData.totalAmount);
      const collateralAmountFloat = parseFloat(formData.collateralAmount);
      
      // Format to appropriate decimal places to avoid precision errors
      const loanAmountFixed = loanAmountFloat.toFixed(loanTokenInfo.decimals);
      const collateralAmountFixed = collateralAmountFloat.toFixed(collateralTokenInfo.decimals);
      
      // Convert to wei/token units
      const totalAmount = ethers.parseUnits(loanAmountFixed, loanTokenInfo.decimals).toString();
      const collateralAmount = ethers.parseUnits(collateralAmountFixed, collateralTokenInfo.decimals).toString();
      
      // Validation against min/max amounts
      const minLoanAmount = BigInt(loanTokenInfo.minLoanAmount);
      const maxLoanAmount = BigInt(loanTokenInfo.maxLoanAmount);
      const totalAmountBigInt = BigInt(totalAmount);
      
      if (totalAmountBigInt < minLoanAmount) {
        alert(`Loan amount must be at least ${ethers.formatUnits(minLoanAmount, loanTokenInfo.decimals)} ${loanTokenInfo.symbol}`);
        return;
      }
      
      if (totalAmountBigInt > maxLoanAmount) {
        alert(`Loan amount cannot exceed ${ethers.formatUnits(maxLoanAmount, loanTokenInfo.decimals)} ${loanTokenInfo.symbol}`);
        return;
      }
      
      // Convert duration from days to seconds
      const durationInSeconds = formData.duration * 24 * 60 * 60;
      
      // Convert interest rate from percentage to basis points
      const interestRateInBasisPoints = formData.interestRate * 100;

      onSubmit({
        ...formData,
        totalAmount,
        collateralAmount,
        duration: durationInSeconds,
        interestRate: interestRateInBasisPoints,
      });
    } catch (error) {
      console.error('Error processing loan request:', error);
      alert('Error processing loan request. Please check your input values.');
    }
  };


  const getInterestEstimate = () => {
    if (!formData.totalAmount) return '0';
    const principal = parseFloat(formData.totalAmount);
    const interest = (principal * formData.interestRate) / 100;
    return interest.toFixed(6);
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
        <TrendingUp className="mr-2" />
        Request Multi-Token Loan
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Loan Token Selection */}
        <TokenSelector
          label="Loan Token (What you want to borrow)"
          selectedToken={formData.loanToken}
          onTokenChange={(token) => setFormData(prev => ({ ...prev, loanToken: token }))}
          showPrices
        />

        {/* Loan Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Loan Amount ({TOKEN_INFO[formData.loanToken].symbol})
          </label>
          <input
            type="number"
            step="0.000001"
            value={formData.totalAmount}
            onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            placeholder={`Min: ${ethers.formatUnits(TOKEN_INFO[formData.loanToken].minLoanAmount, TOKEN_INFO[formData.loanToken].decimals)}`}
            required
          />
        </div>

        {/* Collateral Token Selection */}
        <TokenSelector
          label="Collateral Token (What you'll deposit as security)"
          selectedToken={formData.collateralToken}
          onTokenChange={(token) => setFormData(prev => ({ ...prev, collateralToken: token }))}
          showPrices
        />

        {/* Cross-Collateral Info */}
        {crossCollateralEnabled && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center text-blue-400 mb-2">
              <Shield className="w-4 h-4 mr-2" />
              <span className="font-medium">Cross-Collateral Enabled</span>
            </div>
            <p className="text-sm text-blue-300">
              You're using {TOKEN_INFO[formData.collateralToken].symbol} as collateral for a {TOKEN_INFO[formData.loanToken].symbol} loan.
              This requires 120% collateralization ratio instead of 150%.
            </p>
          </div>
        )}

        {/* Collateral Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Collateral Amount ({TOKEN_INFO[formData.collateralToken].symbol})
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.000001"
              value={formData.collateralAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, collateralAmount: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              placeholder={calculatedCollateral ? `Suggested: ${calculatedCollateral}` : 'Enter collateral amount'}
              required
            />
            {calculatedCollateral && (
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, collateralAmount: calculatedCollateral }))}
                className="absolute right-2 top-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                Use Suggested
              </button>
            )}
          </div>
        </div>

        {/* Interest Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Interest Rate ({formData.isVariableRate ? 'Variable' : 'Fixed'})
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="1"
              max="30"
              value={formData.interestRate}
              onChange={(e) => setFormData(prev => ({ ...prev, interestRate: parseInt(e.target.value) }))}
              className="flex-1"
            />
            <span className="text-white font-medium w-16">{formData.interestRate}%</span>
          </div>
          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="variableRate"
              checked={formData.isVariableRate}
              onChange={(e) => setFormData(prev => ({ ...prev, isVariableRate: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="variableRate" className="text-sm text-gray-300">
              Variable interest rate (market-driven)
            </label>
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Loan Duration
          </label>
          <select
            value={formData.duration}
            onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>1 Week</option>
            <option value={14}>2 Weeks</option>
            <option value={30}>1 Month</option>
            <option value={60}>2 Months</option>
            <option value={90}>3 Months</option>
            <option value={180}>6 Months</option>
            <option value={365}>1 Year</option>
          </select>
        </div>

        {/* Insurance Option */}
        <div className="p-4 bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center text-sm font-medium text-gray-300">
              <Shield className="w-4 h-4 mr-2" />
              Lender Insurance
            </label>
            <input
              type="checkbox"
              checked={formData.hasInsurance}
              onChange={(e) => setFormData(prev => ({ ...prev, hasInsurance: e.target.checked }))}
              className="rounded"
            />
          </div>
          <p className="text-xs text-gray-400">
            Optional 1% fee to protect lenders against default (increases your borrowing cost)
          </p>
        </div>

        {/* Loan Summary */}
        <div className="bg-gray-700/30 p-4 rounded-lg">
          <div className="flex items-center text-white mb-3">
            <Calculator className="w-4 h-4 mr-2" />
            <span className="font-medium">Loan Summary</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Interest:</span>
              <span className="text-white ml-2">{getInterestEstimate()} {TOKEN_INFO[formData.loanToken].symbol}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Repayment:</span>
              <span className="text-white ml-2">
                {(parseFloat(formData.totalAmount || '0') + parseFloat(getInterestEstimate())).toFixed(6)} {TOKEN_INFO[formData.loanToken].symbol}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Insurance Fee:</span>
              <span className="text-white ml-2">
                {formData.hasInsurance ? (parseFloat(formData.totalAmount || '0') * 0.01).toFixed(6) : '0'} {TOKEN_INFO[formData.loanToken].symbol}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Collateral Ratio:</span>
              <span className="text-white ml-2">120%</span>
            </div>
          </div>
        </div>

        {/* IPFS Document Upload */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-white">
            <Upload className="w-5 h-5" />
            <h3 className="font-medium">Collateral Documentation</h3>
          </div>
          <IPFSDocumentUpload
            onDocumentsChange={setCollateralDocuments}
            maxFiles={3}
            title="Upload Collateral Proof"
            description="Upload documents proving ownership and value of your collateral (property deeds, vehicle titles, appraisals, etc.)"
          />
          {collateralDocuments.length > 0 && (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
              <div className="text-green-400 text-sm font-medium">Documents Uploaded:</div>
              <div className="text-green-300 text-sm space-y-1">
                {collateralDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>{doc.name}</span>
                    <span className="text-green-500 text-xs">({doc.ipfsHash.slice(0, 12)}...)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
        >
          {isSubmitting ? 'Creating Loan Request...' : 'Request Loan'}
        </button>
      </form>
    </div>
  );
};

export default LoanRequestFormV2;