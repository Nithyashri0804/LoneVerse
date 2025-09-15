import React from 'react';
import { Wallet, LogOut, AlertCircle } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

const WalletConnect: React.FC = () => {
  const { account, balance, isConnected, isLoading, connectWallet, disconnectWallet } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    return parseFloat(balance).toFixed(4);
  };

  if (isConnected) {
    return (
      <div className="flex items-center space-x-4 bg-gray-800 rounded-lg px-4 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm text-gray-300">Connected</span>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-white">{formatAddress(account)}</div>
          <div className="text-xs text-gray-400">{formatBalance(balance)} ETH</div>
        </div>
        <button
          onClick={disconnectWallet}
          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
          title="Disconnect Wallet"
        >
          <LogOut size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {typeof window.ethereum === 'undefined' && (
        <div className="flex items-center space-x-2 text-amber-400">
          <AlertCircle size={16} />
          <span className="text-sm">MetaMask required</span>
        </div>
      )}
      <button
        onClick={connectWallet}
        disabled={isLoading}
        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors"
      >
        <Wallet size={16} />
        <span>{isLoading ? 'Connecting...' : 'Connect Wallet'}</span>
      </button>
    </div>
  );
};

export default WalletConnect;