# LoanVerse Local Setup Instructions

## Problem
The "loan id shows 0" and "liquidation process is not starting" issue is because the Hardhat blockchain node and Node.js backend are not running.

## Solution: Start the Services Locally in VS Code

### Step 1: Start Hardhat Blockchain Node
Open the first terminal in VS Code and run:
```bash
cd backend
npm run hardhat-node
```
You should see output like:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8000/
```

### Step 2: Start Node.js Backend Server
Open a **second terminal** in VS Code and run:
```bash
cd backend
npm run dev
```
You should see output like:
```
🚀 Starting LoanVerse Backend...
✅ Liquidation service initialized for LoanVerseV4 at 0x5FbDB2315678afecb367f032d93F642f64180aa3
🌟 LoanVerse Backend running on port 3001
```

### Step 3: Keep Flask Running
The third terminal should keep the Flask ML service running (on port 5000). This is already running if you started the "Start application" workflow.

## What This Does

1. **Hardhat Node (Port 8000)**: Local blockchain that the smart contracts interact with
2. **Backend Server (Port 3001)**: Node.js Express server that manages liquidations and blockchain operations
3. **Flask Service (Port 5000)**: Python ML service for risk analysis

## Verifying It Works

Once both are running, the liquidation service should:
- ✅ Connect to the blockchain at http://localhost:8000
- ✅ Fetch the nextLoanId (should no longer show "0")
- ✅ Monitor for liquidatable loans every 10 seconds
- ✅ Show messages like: "🔍 Checking for liquidatable V4 loans..."

## Troubleshooting

### "JsonRpcProvider failed to detect network"
- Make sure Hardhat node is running in Terminal 1
- Check that it shows "Started HTTP and WebSocket JSON-RPC server"

### "Could not fetch nextLoanId"
- Wait 5-10 seconds - the service will retry automatically
- Ensure Hardhat node is fully initialized

### "Module not found"
- Run `npm install` in the backend directory
- Delete `node_modules` and run `npm install` again if errors persist

## Important Files
- `backend/.env` - Configuration for RPC, contracts, and keys
- `backend/services/liquidationService.js` - Monitors and processes liquidations
- `hardhat.config.js` - Hardhat blockchain configuration
