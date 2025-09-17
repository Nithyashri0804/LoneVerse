# LoanChain - Decentralized P2P Lending Platform

## Overview
LoanChain is a decentralized peer-to-peer lending platform built on Ethereum. Users can request collateralized loans or fund existing loan requests, all managed through smart contracts for transparency and security.

## Project Architecture

### Frontend (React + TypeScript + Vite)
- **Port**: 5000 (configured for Replit environment)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with hot reload
- **Styling**: Tailwind CSS for responsive design
- **Icons**: Lucide React for UI icons

### Smart Contracts (Hardhat + Solidity)
- **Main Contract**: LoanChain.sol - Handles loan requests, funding, repayment, and defaults
- **Security**: Uses OpenZeppelin ReentrancyGuard and Ownable
- **Collateral**: Minimum 150% collateralization required
- **Networks**: Configured for Hardhat local and Sepolia testnet

### Key Features
- Wallet connection via MetaMask (ethers.js v6)
- Collateralized loan requests
- P2P loan funding
- Automated loan repayment and collateral handling
- Default management with collateral claiming

## Recent Changes (GitHub Import Setup & Error Fixes)

### ✅ Initial Setup Completed
- Installed all frontend and backend npm dependencies
- Configured Vite for Replit environment (0.0.0.0 host, allowedHosts: true)
- Set up frontend workflow on port 5000
- Set up backend workflow on port 3001
- Updated browserslist database
- Configured deployment for production (autoscale)

### ✅ Smart Contract Deployment
- Successfully deployed LoanChain contract to local Hardhat network
- Contract address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
- Environment configured with VITE_HARDHAT_LOANCHAIN_ADDRESS

### ✅ Critical Bug Fixes & Improvements
- **Fixed Runtime Crashes**: Added null guards for account handling in Dashboard.tsx to prevent crashes when wallet is disconnected
- **Fixed Financial Precision**: Replaced floating-point math with wei-based BigInt arithmetic for loan repayment calculations to prevent rounding errors
- **Updated Ethers.js v6 Compatibility**: 
  - Replaced deprecated `.toNumber()` with `Number().toString()`
  - Fixed `ethers.utils.*` methods to use `ethers.*` directly  
  - Updated `ethers.constants.AddressZero` to `ethers.ZeroAddress`
- **Added Safety Guards**: Added account null checks to all action functions (canFund, canRepay, canClaimCollateral)
- **Improved Error Handling**: Enhanced component-level error handling with proper state management

## Current State
- ✅ Frontend server running successfully on port 5000
- ✅ Backend API server running successfully on port 3001  
- ✅ Smart contracts deployed to local Hardhat network (0x5FbDB2315678afecb367f032d93F642f64180aa3)
- ✅ All dependencies installed and resolved (frontend and backend)
- ✅ Vite configuration optimized for Replit (host 0.0.0.0, allowedHosts: true)
- ✅ Backend configured with proper CORS for frontend communication
- ✅ Deployment configured for production (autoscale)
- ✅ Both workflows properly configured and running
- ✅ **All critical bugs fixed and code is production-ready**

## Backend API Features
- 🤖 **AI Risk Assessment**: ML-powered loan risk scoring with TensorFlow.js
- 📊 **Analytics**: Comprehensive loan and platform analytics endpoints
- 📧 **Notifications**: Email and WebSocket notification system  
- 🗄️ **IPFS Integration**: Decentralized document storage via Pinata
- 🔒 **Security**: Rate limiting, input validation, comprehensive error handling

## Technical Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Ethers.js v6
- **Backend API**: Node.js, Express, TensorFlow.js (ML/AI), CORS, Helmet
- **Smart Contracts**: Hardhat, Solidity 0.8.19/0.8.20, OpenZeppelin
- **Blockchain**: Ethereum (Local Hardhat + Sepolia testnet configured)
- **Development**: ESLint, PostCSS, Hot Module Reload

## Code Quality & Security
- ✅ Production-ready error handling with null guards
- ✅ Financial calculations use precise wei-based arithmetic
- ✅ Ethers.js v6 compatibility with modern best practices
- ✅ Component-level safety guards against undefined states
- ✅ Hot module reload for efficient development
- ✅ TypeScript strict mode enabled for type safety