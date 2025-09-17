import { useState } from 'react';
import { Link2, Github, Twitter, Shield } from 'lucide-react';
import WalletConnect from './components/WalletConnect';
import LoanRequestForm from './components/LoanRequestForm';
import Dashboard from './components/Dashboard';
import { useWallet } from './hooks/useWallet';

function App() {
  const { isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'request'>('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLoanSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Link2 className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">LoanVerse</h1>
                <p className="text-xs text-gray-400">Next-Gen DeFi Lending</p>
              </div>
            </div>
            
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="p-6 bg-blue-600 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Shield className="text-white" size={48} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Welcome to LoanVerse
              </h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Advanced DeFi lending with AI-powered risk assessment, multi-token support, 
                and transparent smart contract execution. Join the future of peer-to-peer finance.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="text-blue-400 font-medium mb-1">AI-Powered</div>
                  <div className="text-gray-300">ML-based risk assessment</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="text-green-400 font-medium mb-1">Multi-Token</div>
                  <div className="text-gray-300">ETH & ERC-20 support</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="text-purple-400 font-medium mb-1">Secure</div>
                  <div className="text-gray-300">Audited smart contracts</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-8 w-fit">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('request')}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'request'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Request Loan
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'dashboard' ? (
              <Dashboard key={refreshKey} />
            ) : (
              <div className="max-w-2xl mx-auto">
                <LoanRequestForm onSuccess={handleLoanSuccess} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Link2 className="text-white" size={20} />
              </div>
              <div>
                <div className="text-white font-medium">LoanVerse</div>
                <div className="text-xs text-gray-400">Built on Ethereum</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Github size={20} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Twitter size={20} />
              </a>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-700 text-center text-sm text-gray-400">
            <p>© 2024 LoanVerse. Next-generation DeFi lending with AI-powered risk assessment.</p>
            <p className="mt-1">Always verify contract addresses and do your own research before transacting.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;