import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useContract } from '../hooks/useContract';
import { useWallet } from '../hooks/useWallet';
import { Droplet } from 'lucide-react';

const TokenFaucet: React.FC = () => {
  const { contract } = useContract();
  const { account } = useWallet();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const mintTokens = async (tokenId: number, tokenSymbol: string, decimals: number) => {
    if (!contract || !account) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const tokenInfo = await contract.supportedTokens(tokenId);
      const tokenAddress = tokenInfo.contractAddress;

      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        setError('Invalid token address');
        return;
      }

      const erc20Contract = new ethers.Contract(
        tokenAddress,
        [
          'function faucet(uint256 amount) external',
          'function balanceOf(address account) external view returns (uint256)',
        ],
        contract.runner
      );

      const amount = ethers.parseUnits('1000', decimals);

      const tx = await erc20Contract.faucet(amount);
      await tx.wait();

      const newBalance = await erc20Contract.balanceOf(account);
      const balanceFormatted = ethers.formatUnits(newBalance, decimals);

      setMessage(`Successfully minted 1,000 ${tokenSymbol}! Your balance: ${balanceFormatted} ${tokenSymbol}`);
    } catch (err: any) {
      console.error('Error minting tokens:', err);
      setError(err.message || 'Failed to mint tokens');
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Droplet className="text-blue-400" size={24} />
        <h3 className="text-xl font-bold text-white">Test Token Faucet</h3>
      </div>
      
      <p className="text-gray-400 mb-4">
        Get free test tokens for contributing to loans on the local network
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => mintTokens(1, 'USDC', 6)}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Minting...' : 'Get 1,000 USDC'}
        </button>

        <button
          onClick={() => mintTokens(2, 'DAI', 18)}
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Minting...' : 'Get 1,000 DAI'}
        </button>

        <button
          onClick={() => mintTokens(3, 'USDT', 6)}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Minting...' : 'Get 1,000 USDT'}
        </button>
      </div>

      {message && (
        <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg text-green-400">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};

export default TokenFaucet;
