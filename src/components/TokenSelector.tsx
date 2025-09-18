import React from 'react';
import { TokenType, TOKEN_INFO } from '../types/loan';

interface TokenSelectorProps {
  label: string;
  selectedToken: TokenType;
  onTokenChange: (token: TokenType) => void;
  availableTokens?: TokenType[];
  disabled?: boolean;
  showPrices?: boolean;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({
  label,
  selectedToken,
  onTokenChange,
  availableTokens = [TokenType.NATIVE_ETH, TokenType.USDC, TokenType.DAI, TokenType.USDT],
  disabled = false,
  showPrices = false,
}) => {
  const getTokenIcon = (tokenType: TokenType) => {
    switch (tokenType) {
      case TokenType.NATIVE_ETH:
        return '⟠';
      case TokenType.USDC:
        return '💎';
      case TokenType.DAI:
        return '🟨';
      case TokenType.USDT:
        return '🟢';
      default:
        return '🪙';
    }
  };

  const getMockPrice = (tokenType: TokenType) => {
    switch (tokenType) {
      case TokenType.NATIVE_ETH:
        return '$2,500';
      case TokenType.USDC:
      case TokenType.DAI:
      case TokenType.USDT:
        return '$1.00';
      default:
        return '$0.00';
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {availableTokens.map((tokenType) => {
          const tokenInfo = TOKEN_INFO[tokenType];
          const isSelected = selectedToken === tokenType;
          
          return (
            <button
              key={tokenType}
              type="button"
              onClick={() => onTokenChange(tokenType)}
              disabled={disabled || !tokenInfo.isActive}
              className={`
                p-3 rounded-lg border-2 transition-all duration-200 
                ${isSelected 
                  ? 'border-blue-500 bg-blue-500/20 text-blue-400' 
                  : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                }
                ${disabled || !tokenInfo.isActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                flex items-center justify-between
              `}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getTokenIcon(tokenType)}</span>
                <div className="text-left">
                  <div className="font-medium">{tokenInfo.symbol}</div>
                  <div className="text-xs text-gray-400">{tokenInfo.name}</div>
                </div>
              </div>
              {showPrices && (
                <div className="text-sm text-gray-400">
                  {getMockPrice(tokenType)}
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {selectedToken !== TokenType.NATIVE_ETH && (
        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-xs text-blue-400">
            ℹ️ ERC-20 tokens require approval for transfers. You'll need to approve the contract first.
          </p>
        </div>
      )}
    </div>
  );
};

export default TokenSelector;