# Smart Contract Deployment Guide

## Problem
The loan array is empty because the smart contracts haven't been deployed to your local Hardhat blockchain yet.

## Solution: Deploy the Contract

### Step 1: Make Sure Hardhat Node is Running
In your **first terminal**, verify the Hardhat node is running:
```bash
cd backend
npm run hardhat-node
```
You should see: `Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8000/`

### Step 2: Deploy the Contract (New Third Terminal)
In a **new terminal** (not the Hardhat node, not the backend), run:
```bash
cd backend
npx hardhat run scripts/deploy.js --network localhost
```

### Step 3: Update .env with the New Address
The deployment script will output something like:
```
✅ LoanVerse contract deployed successfully!
📍 Contract Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Copy the contract address and update your `backend/.env` file:
```
VITE_LOANVERSE_V4_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### Step 4: Restart the Backend Server
Go to your **second terminal** (where backend is running with `npm run dev`) and:
1. Press `Ctrl+C` to stop it
2. Run `npm run dev` again

The backend should now connect successfully and show:
```
✅ Liquidation service initialized for LoanVerseV4 at 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## What This Does
1. **Deploys** the compiled LoanVerse contract to your local Hardhat blockchain
2. **Creates** the contract at a new address on the blockchain
3. **Enables** the liquidation service to read loan data from the contract
4. **Initializes** the nextLoanId counter (starts at 0)

## Complete Workflow

### Terminal 1 - Hardhat Node
```bash
cd backend
npm run hardhat-node
```

### Terminal 2 - Deploy Contract
```bash
cd backend
npx hardhat run scripts/deploy.js --network localhost
# Note: Copy the contract address from output
```

### Terminal 3 - Update .env
Edit `backend/.env` and set:
```
VITE_LOANVERSE_V4_ADDRESS=0x[copied-address]
```

### Terminal 2 - Start Backend
```bash
cd backend
npm run dev
```

## Troubleshooting

### "Contract not found" error
- Ensure the contract has been compiled
- Check that `LoanVerse.json` exists in `backend/contracts/`

### Deployment fails
- Make sure Hardhat node is running on port 8000
- Wait a few seconds after starting Hardhat before deploying

### Backend still can't connect
- Restart the backend server after updating .env
- Check that the address in .env matches the deployment output

## Next Steps
Once deployed:
- Create a loan through the frontend
- The liquidation service will monitor it every 10 seconds
- It will process liquidations when conditions are met
