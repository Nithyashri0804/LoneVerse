# Local Development Setup for LoanVerse (VS Code)

To run this project locally on your machine and test the demonstration-ready liquidation bot, follow these steps:

## Prerequisites
1. **Node.js**: Installed (v18 or higher)
2. **VS Code**: Installed
3. **MetaMask**: Installed in your browser

## Step 1: Clone and Install Dependencies
Open your terminal and run:
```bash
# In the root directory
npm install

# In the backend directory
cd backend && npm install && cd ..
```

## Step 2: Configure Environment Variables
Create a `.env` file in the root directory:
```env
VITE_LOANVERSE_V4_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
RPC_URL=http://127.0.0.1:8545
LIQUIDATOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Also create a `.env` file inside the `backend` folder:
```env
PORT=3001
VITE_LOANVERSE_V4_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
LIQUIDATOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RPC_URL=http://127.0.0.1:8545
```

## Step 3: Run Local Blockchain (Terminal 1)
```bash
npx hardhat node
```
*Note: This will output 20 accounts. Account #0 is your liquidator.*

## Step 4: Deploy Smart Contracts (Terminal 2)
```bash
npx hardhat run scripts/deployV4.js --network localhost
```
*Copy the LoanVerseV4 address from the output and ensure it matches your .env file.*

## Step 5: Start Backend Server (Terminal 3)
```bash
cd backend
npm run dev
```
*Check for the log: "🚀 Starting LoanVerseV4 automated liquidation monitoring..."*

## Step 6: Start Frontend Application (Terminal 4)
```bash
npm run dev
```
*Open http://localhost:5173 in your browser.*

## Common Troubleshooting
### "network is not available yet" or "ECONNREFUSED"
If the backend fails to connect:
1. Ensure the Hardhat node terminal is still running.
2. If using Windows, try changing `localhost` to `127.0.0.1` in your `.env` files.
3. Make sure you have deployed the contracts *after* starting the node.
1. **MetaMask**: Connect MetaMask to "Localhost 8545".
2. **Import Account**: Import Account #1 (from the hardhat node output) into MetaMask.
3. **Request Loan**: Create a loan with a **1-minute** duration.
4. **Fund Loan**: Use a different account to fund it.
5. **Wait**: After the 1-minute loan expires, wait **2 more minutes** (the grace period).
6. **Watch Logs**: Monitor the **Backend Terminal**. You will see the bot automatically trigger the liquidation and claim the collateral!
