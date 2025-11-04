# LoanVerse - DeFi Lending Platform with AI Credit Scoring

## Overview
LoanVerse is a comprehensive DeFi lending platform designed to provide decentralized lending and borrowing services. Its core innovation lies in an AI-powered credit scoring system that analyzes on-chain wallet data, assigning a credit score within a 300-850 range. This system aims to broaden access to DeFi lending by providing a robust, data-driven assessment of borrower trustworthiness. The project envisions reducing risk for lenders and offering competitive rates for borrowers, ultimately enhancing liquidity and participation in the DeFi ecosystem.

## User Preferences
I prefer simple language and clear explanations. I want iterative development, with small, testable changes. Please ask before making any major architectural changes or refactoring large parts of the codebase.

**IMPORTANT: I strongly prefer running this project locally in VS Code, completely independent from Replit. When I ask for local development setup, provide ONLY local VS Code instructions with localhost URLs, not Replit-based solutions.**

**Development Environment Preference**: I am primarily developing this project in VS Code with local localhost URLs.

## System Architecture

### Core Features
- **AI-Powered Credit Scoring (300-850 Scale)**: Utilizes transaction analysis (30%), portfolio stability (25%), lending history (25%), and DeFi behavior (20%) to determine a credit score, akin to traditional FICO scores.
- **On-Chain Wallet Analysis**: Integrates with real blockchain data (e.g., via Etherscan API) for transaction metrics, portfolio analysis, and DeFi behavior tracking. Includes deterministic fallbacks for local development.
- **Multi-Token Support**: Supports major tokens (ETH, USDC, USDT, DAI, WBTC, LINK) with real-time valuation via Chainlink price feeds and automated liquidation mechanisms.
- **AI Customer Support**: Integrates Google Gemini chatbot for platform-specific knowledge, intent analysis, and FAQ suggestions.
- **Dataset Generator**: Creates realistic, synthetic wallet transaction data (1000+ addresses) for testing and model training, exportable in JSON and CSV formats.
- **Logistic Regression ML Service**: A Python-based Flask REST API service using scikit-learn for loan default prediction, achieving 71.34% ROC-AUC. It includes a real-time data collection framework for continuous model improvement.
- **Multi-Lender Pooling (LoanVerseV4)**: Enables multiple lenders to fund a single loan, with proportional interest distribution, minimum contribution limits, funding deadlines with automatic refunds, and a voting mechanism for collateral liquidation.
- **Connection Pooling**: Implements HTTP, Blockchain Provider, Redis, and Database connection pooling for enhanced performance and resource efficiency, reducing API call latency by 30-50%.

### Technical Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Ethers.js v6
- **Smart Contracts**: Solidity 0.8.19/0.8.20, Hardhat, OpenZeppelin
- **Backend API**: Node.js, Express
- **AI/ML**: Google Gemini AI (chatbot), Python ML Service (scikit-learn, Flask)
- **Blockchain**: Ethereum-compatible (Hardhat local, Sepolia testnet)

### System Design
- **Modular Architecture**: Clear separation between frontend, backend, and smart contracts.
- **Data Handling**: Real blockchain data integration with robust deterministic fallbacks for development.
- **AI Integration**: Leverages free-tier AI services for credit scoring and customer support.
- **Credit Scoring Algorithm**: A weighted algorithm combining various on-chain metrics, normalized to a 300-850 range.

## External Dependencies

- **Ethereum Blockchain**: For smart contract deployment and interaction (Hardhat local, Sepolia testnet).
- **MetaMask**: Wallet extension for user authentication and transaction signing.
- **OpenZeppelin Contracts**: For secure and audited smart contract components.
- **Etherscan API**: (Optional) For fetching real-time blockchain data and transaction history.
- **Google Gemini AI**: (Optional) For AI-powered chatbot functionalities.