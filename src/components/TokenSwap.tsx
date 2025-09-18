import { useState, useEffect } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import { ArrowUpDown, Settings } from 'lucide-react';
import { TokenType, TOKEN_INFO } from '../types/loan';
import { useWallet } from '../hooks/useWallet';
import { CONTRACT_ADDRESSES } from '../config/contracts';

// TokenSwap ABI (simplified for basic functionality)
const TOKEN_SWAP_ABI = [
  "function getSwapQuote(uint8 fromToken, uint8 toToken, uint256 amountIn) external view returns (uint256 amountOut, uint256 fee, uint256 exchangeRate)",
  "function swap(tuple(uint8 fromToken, uint8 toToken, uint256 amountIn, uint256 minAmountOut, address to) params) external payable",
  "function swapFeeRate() external view returns (uint256)"
];

interface SwapQuote {
  amountOut: string;
  fee: string;
  exchangeRate: string;
  priceImpact: number;
}

export function TokenSwap() {
  const { account } = useWallet();
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [fromToken, setFromToken] = useState<TokenType>(TokenType.NATIVE_ETH);
  const [toToken, setToToken] = useState<TokenType>(TokenType.USDC);
  const [fromAmount, setFromAmount] = useState<string>('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [slippageTolerance] = useState<number>(1.0); // 1%
  const [isLoading, setIsLoading] = useState(false);
  const [swapFeeRate, setSwapFeeRate] = useState<number>(0);

  // Get swap quote when inputs change
  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0 && provider && fromToken !== toToken) {
      getSwapQuote();
    } else {
      setQuote(null);
    }
  }, [fromAmount, fromToken, toToken, provider]);

  // Initialize provider and load swap fee rate
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const browserProvider = new BrowserProvider(window.ethereum);
      setProvider(browserProvider);
    }
  }, []);

  useEffect(() => {
    if (provider) {
      loadSwapFeeRate();
    }
  }, [provider]);

  const loadSwapFeeRate = async () => {
    try {
      const tokenSwapAddress = CONTRACT_ADDRESSES[31337].tokenSwap;
      if (!tokenSwapAddress) {
        throw new Error('TokenSwap contract not deployed');
      }
      
      const swapContract = new ethers.Contract(
        tokenSwapAddress,
        TOKEN_SWAP_ABI,
        provider
      );
      const feeRate = await swapContract.swapFeeRate();
      setSwapFeeRate(Number(feeRate) / 100); // Convert from basis points to percentage
    } catch (error) {
      console.error('Error loading swap fee rate:', error);
    }
  };

  const getSwapQuote = async () => {
    if (!provider || !fromAmount || fromToken === toToken) return;

    try {
      setIsLoading(true);
      const tokenSwapAddress = CONTRACT_ADDRESSES[31337].tokenSwap;
      if (!tokenSwapAddress) {
        throw new Error('TokenSwap contract not deployed');
      }
      
      const swapContract = new ethers.Contract(
        tokenSwapAddress,
        TOKEN_SWAP_ABI,
        provider
      );

      const fromDecimals = TOKEN_INFO[fromToken].decimals;
      const toDecimals = TOKEN_INFO[toToken].decimals;
      const amountIn = ethers.parseUnits(fromAmount, fromDecimals);

      const [amountOut, fee, exchangeRate] = await swapContract.getSwapQuote(
        fromToken,
        toToken,
        amountIn
      );

      const amountOutFormatted = ethers.formatUnits(amountOut, toDecimals);
      const feeFormatted = ethers.formatUnits(fee, toDecimals);
      const exchangeRateFormatted = ethers.formatUnits(exchangeRate, fromDecimals);

      // Calculate price impact (simplified)
      const expectedRate = parseFloat(exchangeRateFormatted);
      const actualRate = parseFloat(amountOutFormatted) / parseFloat(fromAmount);
      const priceImpact = Math.abs((expectedRate - actualRate) / expectedRate) * 100;

      setQuote({
        amountOut: amountOutFormatted,
        fee: feeFormatted,
        exchangeRate: exchangeRateFormatted,
        priceImpact
      });
    } catch (error) {
      console.error('Error getting swap quote:', error);
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  };

  const executeSwap = async () => {
    if (!account || !provider || !quote || !fromAmount) return;

    try {
      setIsLoading(true);
      const signer = await provider.getSigner();
      const swapContract = new ethers.Contract(
        CONTRACT_ADDRESSES[31337].tokenSwap,
        TOKEN_SWAP_ABI,
        signer
      );

      const fromDecimals = TOKEN_INFO[fromToken].decimals;
      const toDecimals = TOKEN_INFO[toToken].decimals;
      const amountIn = ethers.parseUnits(fromAmount, fromDecimals);
      
      // Calculate minimum amount out with slippage tolerance
      const minAmountOut = ethers.parseUnits(
        (parseFloat(quote.amountOut) * (100 - slippageTolerance) / 100).toFixed(toDecimals),
        toDecimals
      );

      const swapParams = {
        fromToken,
        toToken,
        amountIn,
        minAmountOut,
        to: account
      };

      let tx;
      if (fromToken === TokenType.NATIVE_ETH) {
        tx = await swapContract.swap(swapParams, { value: amountIn });
      } else {
        // For ERC20 tokens, would need to approve first (simplified for demo)
        tx = await swapContract.swap(swapParams);
      }

      console.log('Swap transaction:', tx.hash);
      await tx.wait();
      
      // Reset form after successful swap
      setFromAmount('');
      setQuote(null);
      
    } catch (error) {
      console.error('Error executing swap:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const swapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount('');
    setQuote(null);
  };

  const availableTokens = [
    TokenType.NATIVE_ETH,
    TokenType.USDC,
    TokenType.DAI,
    TokenType.USDT
  ];

  return (
    <div className="max-w-md mx-auto bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Token Swap</h2>
        <Settings className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white" />
      </div>

      {/* From Token Section */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">From</label>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <select
              value={fromToken}
              onChange={(e) => setFromToken(Number(e.target.value) as TokenType)}
              className="bg-gray-600 text-white rounded-lg px-3 py-2 border border-gray-500 focus:border-blue-500 focus:outline-none"
            >
              {availableTokens.map(token => (
                <option key={token} value={token} disabled={token === toToken}>
                  {TOKEN_INFO[token].symbol} - {TOKEN_INFO[token].name}
                </option>
              ))}
            </select>
          </div>
          <input
            type="number"
            placeholder="0.0"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            className="w-full bg-transparent text-white text-lg font-medium placeholder-gray-400 focus:outline-none"
            step="any"
          />
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={swapTokens}
          className="bg-gray-700 hover:bg-gray-600 rounded-full p-2 border border-gray-600"
        >
          <ArrowUpDown className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      {/* To Token Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">To</label>
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <select
              value={toToken}
              onChange={(e) => setToToken(Number(e.target.value) as TokenType)}
              className="bg-gray-600 text-white rounded-lg px-3 py-2 border border-gray-500 focus:border-blue-500 focus:outline-none"
            >
              {availableTokens.map(token => (
                <option key={token} value={token} disabled={token === fromToken}>
                  {TOKEN_INFO[token].symbol} - {TOKEN_INFO[token].name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-white text-lg font-medium">
            {quote ? parseFloat(quote.amountOut).toFixed(6) : '0.0'}
          </div>
        </div>
      </div>

      {/* Swap Details */}
      {quote && (
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <div className="text-sm text-gray-300 space-y-2">
            <div className="flex justify-between">
              <span>Exchange Rate:</span>
              <span>1 {TOKEN_INFO[fromToken].symbol} = {parseFloat(quote.exchangeRate).toFixed(6)} {TOKEN_INFO[toToken].symbol}</span>
            </div>
            <div className="flex justify-between">
              <span>Fee ({swapFeeRate}%):</span>
              <span>{parseFloat(quote.fee).toFixed(6)} {TOKEN_INFO[toToken].symbol}</span>
            </div>
            <div className="flex justify-between">
              <span>Slippage Tolerance:</span>
              <span>{slippageTolerance}%</span>
            </div>
            <div className="flex justify-between">
              <span>Minimum Received:</span>
              <span>{(parseFloat(quote.amountOut) * (100 - slippageTolerance) / 100).toFixed(6)} {TOKEN_INFO[toToken].symbol}</span>
            </div>
          </div>
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={executeSwap}
        disabled={!account || !quote || isLoading || !fromAmount}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
      >
        {isLoading ? (
          'Processing...'
        ) : !account ? (
          'Connect Wallet'
        ) : !fromAmount ? (
          'Enter Amount'
        ) : fromToken === toToken ? (
          'Select Different Tokens'
        ) : (
          'Swap Tokens'
        )}
      </button>
    </div>
  );
}