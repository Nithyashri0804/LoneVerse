# LoanChain - Decentralized P2P Lending Platform

## Overview
LoanChain is a decentralized peer-to-peer lending platform built on Ethereum. It enables users to request and fund collateralized loans through transparent and secure smart contracts. The platform aims to provide a robust P2P lending solution with features for loan management, repayment, and default handling.

## User Preferences
I prefer simple language and clear explanations. I want iterative development, with small, testable changes. Please ask before making any major architectural changes or refactoring large parts of the codebase. Do not make changes to the `deployments/localhost-deployment.js` file.

## System Architecture

### UI/UX Decisions
The frontend is built with React 18 and TypeScript, using Vite for fast development and Tailwind CSS for a responsive, modern design. Lucide React provides a consistent set of UI icons. The UI is designed to be intuitive for wallet connection, loan requests, funding, and tracking.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Ethers.js v6. Configured for Replit with dev server on port 5000.
- **Smart Contracts**: Developed with Hardhat and Solidity (0.8.19/0.8.20), secured by OpenZeppelin. The core `LoanChain.sol` contract manages loan lifecycle, requiring a minimum 150% collateralization.
- **Backend API**: Node.js and Express, providing AI-powered risk assessment, analytics, and notification services. Runs on port 3001 with CORS configured for Replit.
- **Blockchain**: Ethereum-compatible, supporting local Hardhat network (port 8000) and Sepolia testnet.
- **Development Tooling**: ESLint, PostCSS, Hot Module Reload for efficient development.

### Feature Specifications
- Wallet connection (MetaMask via Ethers.js v6).
- Collateralized loan requests and P2P funding.
- Automated loan repayment and collateral management.
- Default management with collateral claiming.
- AI-powered loan risk scoring (TensorFlow.js).
- Comprehensive analytics and notification system (email/WebSocket).
- Production-ready error handling and precise wei-based arithmetic for financial calculations.

### System Design Choices
The project follows a modular architecture separating frontend, backend API, and smart contracts. Frontend communicates with smart contracts via Ethers.js and with the backend API for off-chain services. The backend utilizes ML for risk assessment and integrates with IPFS for decentralized storage. Deployment is configured for autoscale environments.

## External Dependencies
- **Ethereum Blockchain**: For smart contract deployment and transactions (local Hardhat network, Sepolia testnet).
- **MetaMask**: For user wallet interactions.
- **OpenZeppelin**: Standard contracts for security (e.g., ReentrancyGuard, Ownable).
- **TensorFlow.js**: For AI-powered loan risk assessment in the backend.
- **Pinata**: For IPFS integration (decentralized document storage).
- **Nodemailer**: For email notifications from the backend.
- **Vite**: Frontend build tool.
- **Tailwind CSS**: For styling.
- **Lucide React**: For UI icons.
- **Ethers.js v6**: For interacting with Ethereum smart contracts from the frontend.
```