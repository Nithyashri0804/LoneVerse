# LoanChain - Decentralized P2P Lending Platform

## Overview
LoanChain is a decentralized peer-to-peer lending platform built on Ethereum. It enables users to request collateralized loans and fund existing loan requests through transparent and secure smart contracts. The platform focuses on automating loan lifecycle management, from funding to repayment and default handling, ensuring a robust and trustless lending environment.

## User Preferences
I prefer iterative development with clear, concise explanations at each step. Please ask before making any major architectural changes or introducing new dependencies. I value code readability and maintainability.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (configured for Replit, port 5000)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Wallet Integration**: MetaMask via Ethers.js v6

### Smart Contracts
- **Platform**: Hardhat, Solidity 0.8.19/0.8.20
- **Main Contracts**: `LoanChain.sol` (handles loan requests, funding, repayment, defaults), `LoanChainV2` (multi-token support), `TokenSwap`
- **Security**: OpenZeppelin (ReentrancyGuard, Ownable)
- **Collateral**: Minimum 150% collateralization
- **Network**: Ethereum (Local Hardhat, Sepolia testnet)

### Backend API
- **Technology**: Node.js, Express
- **Core Features**: AI-powered loan risk assessment (TensorFlow.js), Analytics, Email/WebSocket Notifications, IPFS Integration (Pinata)
- **Security**: Rate limiting, input validation, CORS configured for Replit proxy

### Core Features
- Collateralized loan requests and P2P funding
- Automated loan repayment and collateral management
- Default management with collateral claiming
- Multi-token support for loans and collateral
- ML-powered risk assessment for loans
- Comprehensive analytics and notification systems

## External Dependencies
- **Blockchain**: Ethereum network
- **Wallet**: MetaMask
- **IPFS Storage**: Pinata
- **Machine Learning**: TensorFlow.js
- **Smart Contract Libraries**: OpenZeppelin
- **Email Service**: Nodemailer (integrated into backend)