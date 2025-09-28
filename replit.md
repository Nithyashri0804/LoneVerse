# LoanChain - Decentralized P2P Lending Platform

## Overview
LoanChain is a decentralized peer-to-peer lending platform built on Ethereum. It enables users to request and fund collateralized loans through transparent and secure smart contracts. The platform aims to provide a robust P2P lending solution with features for loan management, repayment, and default handling.

## User Preferences
I prefer simple language and clear explanations. I want iterative development, with small, testable changes. Please ask before making any major architectural changes or refactoring large parts of the codebase. Do not make changes to the `deployments/localhost-deployment.js` file.

**IMPORTANT: I strongly prefer running this project locally in VS Code, completely independent from Replit. When I ask for local development setup, provide ONLY local VS Code instructions with localhost URLs, not Replit-based solutions. Do not suggest Replit alternatives when I explicitly request local development.**

**Development Environment Preference**: I am primarily developing this project in VS Code with local localhost URLs. The project has been successfully imported and configured to work in both environments, but my preference is VS Code development.

## System Architecture

### UI/UX Decisions
The frontend is built with React 18 and TypeScript, using Vite for fast development and Tailwind CSS for a responsive, modern design. Lucide React provides a consistent set of UI icons. The UI is designed to be intuitive for wallet connection, loan requests, funding, and tracking.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Ethers.js v6. Supports both Replit and local VS Code development with dev server on port 5000.
- **Smart Contracts**: Developed with Hardhat and Solidity (0.8.19/0.8.20), secured by OpenZeppelin. The core `LoanChain.sol` contract manages loan lifecycle, requiring a minimum 150% collateralization.
- **Backend API**: Node.js and Express, providing AI-powered risk assessment, analytics, and notification services. Runs on port 3001 with CORS configured for both Replit and localhost.
- **Blockchain**: Ethereum-compatible, supporting local Hardhat network (port 8000) and Sepolia testnet.
- **Development Tooling**: ESLint, PostCSS, Hot Module Reload for efficient development.

### Local VS Code Development Setup
For local development, the project runs completely independently:
- **Frontend**: `npm run dev` → http://localhost:5000
- **Backend**: `cd backend && npm start` → http://localhost:3001  
- **Blockchain**: `npx hardhat node --port 8000` → http://localhost:8000
- **Deploy Contracts**: `npx hardhat run scripts/deployV2.js --network localhost`
- **MetaMask Config**: RPC URL `http://localhost:8000`, Chain ID `31337`

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

## Recent Changes
- **September 28, 2025**: Successfully imported fresh GitHub clone and configured for Replit environment
- Installed all frontend and backend dependencies (npm install completed)
- Fixed Vite dev server configuration with explicit host and port binding for Replit compatibility
- Configured three workflows: Frontend (port 5000), Backend API (port 3001), Hardhat Node (port 8000)  
- Deployed LoanChainV2 contracts to local Hardhat network with proper addresses:
  - LoanChainV2: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
  - TokenSwap: 0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0
  - Mock USDC: 0x5FbDB2315678afecb367f032d93F642f64180aa3
  - Mock DAI: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  - Mock USDT: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
- Set up deployment configuration for autoscale production environment
- All systems tested and running successfully with health checks verified
- Frontend accessible with proper UI/UX showing LoanVerse welcome page and smart contract integration
- Backend API running with ML services, email notifications, and risk assessment (health endpoint responding)
- **Confirmed working in Replit**: All three workflows running successfully with proper port configuration and proxy support

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