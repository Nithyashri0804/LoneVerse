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

## Recent Changes (Project Import Setup)
- Installed all npm dependencies
- Configured Vite for Replit environment (0.0.0.0 host, allowedHosts: true)
- Set up frontend workflow on port 5000
- Configured deployment for production (autoscale)

## Current State
- ✅ Frontend server running successfully
- ✅ All dependencies installed and resolved
- ✅ Vite configuration optimized for Replit
- ✅ Deployment configured for production
- ✅ Smart contracts ready for development/testing

## Technical Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Ethers.js
- **Backend**: Hardhat, Solidity 0.8.19/0.8.20
- **Blockchain**: Ethereum (Sepolia testnet configured)
- **Development**: ESLint, PostCSS