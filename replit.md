# LoanVerse - DeFi Lending Platform with AI Credit Scoring

## Overview
LoanVerse is a comprehensive DeFi lending platform featuring AI-powered credit scoring using on-chain wallet analysis. The system implements a 300-850 credit score range (similar to traditional FICO scores) based on transaction analysis, portfolio stability, lending history, and DeFi behavior. Built on Ethereum with multi-token support and Chainlink price feeds.

## User Preferences
I prefer simple language and clear explanations. I want iterative development, with small, testable changes. Please ask before making any major architectural changes or refactoring large parts of the codebase.

**IMPORTANT: I strongly prefer running this project locally in VS Code, completely independent from Replit. When I ask for local development setup, provide ONLY local VS Code instructions with localhost URLs, not Replit-based solutions.**

**Development Environment Preference**: I am primarily developing this project in VS Code with local localhost URLs.

## System Architecture

### Core Features

#### 1. AI-Powered Credit Scoring (300-850 Scale)
- **Transaction Analysis (30%)**: Count, volume, frequency, patterns
- **Portfolio Stability (25%)**: Stablecoin ratio, holding period, volatility, diversity
- **Lending History (25%)**: Repayment rate, defaults, active loans, total borrowed/repaid
- **DeFi Behavior (20%)**: Protocol interactions, yield farming, smart contract usage, DeFi experience

#### 2. On-Chain Wallet Analysis
- Real blockchain data integration via Etherscan API
- Deterministic fallback for local development
- Transaction metrics, portfolio analysis, DeFi behavior tracking
- Support for multiple networks (mainnet, sepolia)

#### 3. Multi-Token Support
- ETH, USDC, USDT, DAI, WBTC, LINK
- Chainlink price feeds for real-time valuation
- Automated liquidation when collateral drops below threshold

#### 4. AI Customer Support
- Google Gemini chatbot integration (FREE tier)
- Platform-specific knowledge about credit scoring
- Intent analysis and FAQ suggestions
- Conversation history support

#### 5. Dataset Generator
- Generate 1000+ deterministic wallet addresses
- Realistic transaction data and risk profiles
- JSON and CSV export formats
- Statistical validation and performance metrics

#### 6. Performance Metrics
- Accuracy metrics: MAE, RMSE, MAPE, R²
- Classification metrics: Precision, recall, F1-score
- FICO benchmark comparison
- Algorithm consistency validation

### Technical Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Ethers.js v6
- **Smart Contracts**: Solidity 0.8.19/0.8.20, Hardhat, OpenZeppelin
- **Backend API**: Node.js, Express
- **AI/ML**: Google Gemini AI (free tier)
- **Blockchain**: Ethereum-compatible (Hardhat local, Sepolia testnet)
- **Real Data**: Etherscan API integration

### Local VS Code Development Setup

#### Prerequisites
- Node.js 20.x
- MetaMask wallet extension
- VS Code or any code editor

#### Environment Variables
Create a `.env` file in the project root:
```bash
# Blockchain
RPC_URL=http://localhost:8000
PRIVATE_KEY=your_private_key_here

# Optional: Real blockchain data (FREE)
ETHERSCAN_API_KEY=your_etherscan_api_key  # Get free at https://etherscan.io/apis

# Optional: AI Chatbot (FREE)
GEMINI_API_KEY=your_gemini_api_key  # Get free at https://aistudio.google.com/apikey

# Backend Configuration
PORT=3001
NODE_ENV=development
```

#### Running the Project

1. **Install Dependencies**
```bash
# Root dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..
```

2. **Start Hardhat Node (Terminal 1)**
```bash
npx hardhat node --port 8000 --hostname 0.0.0.0
```

3. **Deploy Contracts (Terminal 2)**
```bash
npx hardhat run scripts/deployV2.js --network localhost
```

4. **Start Backend API (Terminal 3)**
```bash
cd backend && npm start
```

5. **Start Frontend (Terminal 4)**
```bash
npm run dev
```

#### Access Points
- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:3001
- **Blockchain RPC**: http://localhost:8000
- **Health Check**: http://localhost:3001/health

#### MetaMask Configuration
- **Network Name**: Hardhat Local
- **RPC URL**: http://localhost:8000
- **Chain ID**: 31337
- **Currency Symbol**: ETH

## API Endpoints

### Credit Scoring
- `POST /api/credit-score/calculate` - Calculate credit score for wallet
- `GET /api/credit-score/analyze/:address` - Full wallet analysis
- `POST /api/credit-score/transaction-analysis` - Transaction metrics
- `POST /api/credit-score/portfolio-stability` - Portfolio analysis
- `POST /api/credit-score/defi-behavior` - DeFi behavior metrics

### AI Chatbot
- `POST /api/chatbot/chat` - Generate AI responses
- `POST /api/chatbot/analyze-intent` - Analyze question intent
- `POST /api/chatbot/faq-suggestions` - Get FAQ suggestions
- `GET /api/chatbot/status` - Check chatbot status

### Dataset Generation
- `POST /api/dataset/generate` - Generate wallet dataset
- `GET /api/dataset/statistics` - Generator capabilities
- `POST /api/dataset/validate` - Validate metrics

### Performance Metrics
- `GET /api/performance/benchmark/:score` - FICO comparison
- `POST /api/performance/accuracy` - Calculate accuracy metrics
- `POST /api/performance/classification` - Classification metrics
- `POST /api/performance/system-stats` - System performance
- `POST /api/performance/report` - Comprehensive report

## Smart Contracts

### Deployed Addresses (Local Hardhat)
- **LoanVerseV3**: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
- **TokenSwap**: 0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0
- **Mock USDC**: 0x5FbDB2315678afecb367f032d93F642f64180aa3
- **Mock DAI**: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
- **Mock USDT**: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

### Key Features
- Multi-token collateral support
- Automated liquidation mechanism
- Interest rate calculation based on credit scores
- Chainlink price feed integration
- Secure wei-based arithmetic

## CLI Tools

### Generate Dataset
```bash
# Generate 1000 wallets (JSON)
node backend/scripts/generateDataset.js 1000 json

# Generate 5000 wallets (CSV)
node backend/scripts/generateDataset.js 5000 csv
```

## Recent Changes

### October 12, 2025
- ✅ Implemented 300-850 credit score range with proper clamping
- ✅ Added on-chain wallet analysis with Etherscan API integration
- ✅ Created transaction, portfolio, and DeFi behavior analysis services
- ✅ Integrated Google Gemini AI chatbot (FREE tier, no billing required)
- ✅ Built deterministic dataset generator for 1000+ wallet addresses
- ✅ Implemented performance metrics and statistical validation
- ✅ Added FICO benchmark comparison
- ✅ Fixed async/await bugs in portfolio stability analysis
- ✅ Updated all documentation for VS Code local development

### Credit Scoring Algorithm
The weighted algorithm calculates credit scores from 300-850:
1. Transaction Analysis: 30% weight
2. Portfolio Stability: 25% weight
3. Lending History: 25% weight
4. DeFi Behavior: 20% weight

Final score = 300 + (normalized_score × 550)

## External Dependencies

### Required
- **Ethereum Blockchain**: Smart contracts (Hardhat local, Sepolia)
- **MetaMask**: Wallet interactions
- **OpenZeppelin**: Security contracts
- **Node.js**: Backend runtime
- **Vite**: Frontend build tool
- **Tailwind CSS**: Styling
- **Ethers.js v6**: Ethereum interactions

### Optional (FREE APIs)
- **Etherscan API**: Real blockchain data (https://etherscan.io/apis)
- **Google Gemini**: AI chatbot (https://aistudio.google.com/apikey)

Both APIs are completely free with generous quotas - no billing required!

## Development Notes

### Getting Free API Keys

#### Etherscan API (Optional - for real blockchain data)
1. Visit https://etherscan.io/
2. Create a free account
3. Go to API-Keys section
4. Generate a new API key
5. Add to `.env`: `ETHERSCAN_API_KEY=your_key_here`

#### Google Gemini AI (Optional - for chatbot)
1. Visit https://aistudio.google.com/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Add to `.env`: `GEMINI_API_KEY=your_key_here`

### Testing Without API Keys
The system works perfectly without API keys:
- Uses deterministic mock data for wallet analysis
- Chatbot returns helpful error messages
- All core lending features work normally

### Architecture Decisions
- Modular separation: frontend, backend, smart contracts
- Real blockchain data with deterministic fallbacks
- Free AI integration (Google Gemini, no billing)
- 300-850 credit score range (industry standard)
- Weighted algorithm per research paper requirements
- Comprehensive error handling and validation

## Project Structure
```
loanverse/
├── src/                    # Frontend React app
├── contracts/              # Solidity smart contracts
├── backend/
│   ├── services/          # Business logic
│   │   ├── mlService.js              # Credit scoring
│   │   ├── walletAnalysisService.js  # On-chain analysis
│   │   ├── blockchainDataService.js  # Etherscan integration
│   │   ├── chatbotService.js         # AI chatbot
│   │   ├── datasetGenerator.js       # Dataset generation
│   │   └── performanceMetrics.js     # Statistics
│   ├── routes/            # API endpoints
│   └── scripts/           # CLI tools
├── scripts/               # Deployment scripts
└── data/                  # Generated datasets
```

## Support
For issues or questions, use the AI chatbot (when configured) or check the inline documentation in each service file.
