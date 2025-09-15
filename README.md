# 🔗 LoanChain - Decentralized P2P Lending Platform

LoanChain is a decentralized peer-to-peer lending platform built on Ethereum that enables users to borrow and lend cryptocurrency with collateralized loans, automated smart contract execution, and transparent on-chain transactions.

## ✨ Features

- **🔐 Collateralized Lending**: All loans require 150% minimum collateral ratio for security
- **🤖 Smart Contract Automation**: Automated loan disbursement, repayment tracking, and collateral management
- **💰 Fixed Interest Rates**: Simple, transparent interest rate system
- **⏰ Flexible Loan Terms**: Choose from 7 days to 1 year loan durations
- **🔍 Transparent Dashboard**: Track all your borrowing and lending activity
- **🦊 MetaMask Integration**: Seamless wallet connection and transaction signing
- **📱 Responsive Design**: Beautiful, modern interface that works on all devices

## 🏗️ Architecture

```
LoanChain/
├── contracts/              # Solidity smart contracts
│   └── LoanChain.sol      # Main lending contract
├── src/
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript type definitions
│   └── contracts/        # Contract ABI files
├── scripts/              # Deployment scripts
├── test/                 # Contract tests
└── hardhat.config.js     # Hardhat configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm
- MetaMask browser extension
- Test ETH on Sepolia testnet

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd loanchain
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Compile smart contracts:**
```bash
npx hardhat compile
```

4. **Run tests:**
```bash
npx hardhat test
```

5. **Deploy to local network:**
```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

6. **Start the frontend:**
```bash
npm run dev
```

### Deployment to Sepolia Testnet

1. **Get Sepolia ETH:**
   - Visit [Sepolia Faucet](https://sepoliafaucet.com/)
   - Request test ETH for your wallet

2. **Configure environment:**
```bash
# .env
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key
```

3. **Deploy contract:**
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

4. **Update frontend configuration:**
```bash
# Update .env with deployed contract address
VITE_CONTRACT_ADDRESS=0x...
```

## 💡 How It Works

### For Borrowers

1. **Request a Loan:**
   - Specify loan amount, interest rate, and duration
   - Provide 150% collateral in ETH
   - Submit transaction to create loan request

2. **Wait for Funding:**
   - Lenders can browse and fund your loan request
   - Once funded, loan amount is transferred to you

3. **Repay the Loan:**
   - Repay principal + interest before due date
   - Collateral is automatically returned upon repayment

### For Lenders

1. **Browse Loan Requests:**
   - View all active loan requests
   - See borrower details, terms, and collateral

2. **Fund Loans:**
   - Choose loans that match your risk appetite
   - Fund with one click transaction

3. **Earn Interest:**
   - Receive principal + interest when borrower repays
   - Claim collateral if loan defaults

## 🔒 Security Features

- **Collateral Protection**: 150% minimum collateralization ratio
- **Time-based Liquidation**: Automatic collateral claiming after loan expiry
- **Reentrancy Protection**: OpenZeppelin security patterns
- **Input Validation**: Comprehensive parameter checking
- **Interest Rate Limits**: Maximum 20% interest rate cap

## 🧪 Smart Contract Details

### LoanChain.sol

The main contract handles:
- Loan request creation with collateral deposit
- Loan funding by lenders
- Repayment processing with interest calculation
- Collateral liquidation for defaulted loans
- Loan status tracking and history

### Key Functions

- `requestLoan()`: Create a new loan request with collateral
- `fundLoan()`: Fund an existing loan request
- `repayLoan()`: Repay loan with interest
- `claimCollateral()`: Claim collateral from defaulted loan
- `getActiveLoanRequests()`: Browse available loans

## 🎨 Frontend Features

- **Modern Dark Theme**: Professional DeFi-style interface
- **Real-time Updates**: Automatic refresh of loan data
- **Responsive Design**: Works perfectly on mobile and desktop
- **Transaction Feedback**: Clear loading states and error handling
- **Wallet Integration**: Seamless MetaMask connection

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
npx hardhat test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run specific test file
npx hardhat test test/LoanChain.test.js
```

## 📊 Contract Verification

After deployment, verify your contract on Etherscan:

```bash
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
```

## 🛣️ Roadmap

### Phase 1 (Current - MVP)
- ✅ Basic collateralized lending
- ✅ Fixed interest rates
- ✅ ETH-only loans
- ✅ MetaMask integration

### Phase 2 (Future)
- 🔄 Multi-token support (USDC, DAI, WBTC)
- 🔄 Dynamic interest rate matching
- 🔄 Credit scoring system
- 🔄 IPFS document storage

### Phase 3 (Advanced)
- 🔄 DAO governance
- 🔄 Liquidation auctions
- 🔄 Cross-chain lending
- 🔄 Mobile app

## ⚠️ Disclaimer

This is experimental DeFi software. Please:
- Only use test networks for development
- Audit smart contracts before mainnet deployment
- Never invest more than you can afford to lose
- Understand the risks of DeFi protocols

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

- GitHub Issues: Report bugs and request features
- Documentation: Check the `/docs` folder for detailed guides
- Community: Join our Discord for discussions

---

**Built with ❤️ for the DeFi community**