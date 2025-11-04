import React, { useState, useEffect } from 'react';
import { useContract } from '../hooks/useContract';
import { Copy, CheckCircle, AlertCircle } from 'lucide-react';

interface TokenInfo {
  id: number;
  symbol: string;
  address: string;
  decimals: number;
}

const TokenImportHelper: React.FC = () => {
  const { contract } = useContract();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadTokens();
  }, [contract]);

  const loadTokens = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      const tokenList: TokenInfo[] = [];

      // Load USDC (Token ID 1)
      const usdc = await contract.supportedTokens(1);
      if (usdc.isActive) {
        tokenList.push({
          id: 1,
          symbol: usdc.symbol,
          address: usdc.contractAddress,
          decimals: Number(usdc.decimals),
        });
      }

      // Load DAI (Token ID 2)
      const dai = await contract.supportedTokens(2);
      if (dai.isActive) {
        tokenList.push({
          id: 2,
          symbol: dai.symbol,
          address: dai.contractAddress,
          decimals: Number(dai.decimals),
        });
      }

      // Try USDT (Token ID 3) if it exists
      try {
        const usdt = await contract.supportedTokens(3);
        if (usdt.isActive) {
          tokenList.push({
            id: 3,
            symbol: usdt.symbol,
            address: usdt.contractAddress,
            decimals: Number(usdt.decimals),
          });
        }
      } catch (e) {
        // Token ID 3 might not exist
      }

      setTokens(tokenList);
    } catch (error) {
      console.error('Error loading tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  const addTokenToMetaMask = async (token: TokenInfo) => {
    if (!window.ethereum) {
      alert('MetaMask is not installed');
      return;
    }

    try {
      const params = {
        type: 'ERC20' as const,
        options: {
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
        },
      };
      
      await (window.ethereum as any).request({
        method: 'wallet_watchAsset',
        params,
      });
    } catch (error: any) {
      console.error('Error adding token to MetaMask:', error);
      alert('Failed to add token: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-6 mb-6">
        <p className="text-amber-400">Loading token information...</p>
      </div>
    );
  }

  if (tokens.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-6 mb-6">
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="text-lg font-bold text-amber-400 mb-2">
            Important: Import Correct Token Addresses
          </h3>
          <p className="text-amber-200 text-sm mb-4">
            If you see "Insufficient balance" errors but have tokens in MetaMask, 
            you may have imported a different token contract. Import the CORRECT token addresses below:
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {tokens.map((token) => (
          <div
            key={token.id}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{token.symbol}</span>
                <span className="text-gray-400 text-sm">
                  ({token.decimals} decimals)
                </span>
              </div>
              <button
                onClick={() => addTokenToMetaMask(token)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Add to MetaMask
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <code className="bg-gray-900 text-green-400 px-3 py-2 rounded text-sm flex-1 font-mono">
                {token.address}
              </code>
              <button
                onClick={() => copyToClipboard(token.address)}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                title="Copy address"
              >
                {copied === token.address ? (
                  <CheckCircle className="text-green-400" size={18} />
                ) : (
                  <Copy className="text-gray-400" size={18} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm text-amber-300 bg-amber-950/30 rounded p-3">
        <p className="font-medium mb-1">After importing the correct tokens:</p>
        <ol className="list-decimal list-inside space-y-1 text-amber-200">
          <li>Use the Token Faucet above to get test tokens</li>
          <li>Refresh the page to see your updated balance</li>
          <li>Try contributing to the loan again</li>
        </ol>
      </div>
    </div>
  );
};

export default TokenImportHelper;
