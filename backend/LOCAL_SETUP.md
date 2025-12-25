# Local Development Setup for LoanVerse Backend

## Prerequisites
- Node.js v18 or higher
- npm or yarn

## Installation

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Setup environment variables:**
The `.env` file is already configured for local development. Key settings:
- `RPC_URL=http://localhost:8000` (local Hardhat node)
- `NODE_ENV=development`
- All other values are pre-configured

## Running Locally

### Option 1: Start Everything (Recommended for First Time)

```bash
# Terminal 1 - Start Hardhat blockchain node
npm run hardhat-node

# Terminal 2 - Start the backend server
npm run dev
```

### Option 2: Start Services Separately

**Start Hardhat Node:**
```bash
npx hardhat node --hostname localhost --port 8000
```

**Start Backend Server:**
```bash
node server.js
```

Or with auto-reload:
```bash
npm run dev
```

## Accessing the Application

- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/health
- **Hardhat RPC:** http://localhost:8000

## Testing Endpoints

```bash
# Health check
curl http://localhost:3001/health

# Get liquidation status
curl http://localhost:3001/api/liquidation/status
```

## Liquidation Service

The liquidation service automatically starts and monitors for loans every 10 seconds:
- Checks for past-due loans
- Checks for undercollateralized loans (< 120% collateral ratio)
- Automatically processes liquidations when conditions are met

**Note:** The liquidation service requires:
1. Hardhat node running on port 8000
2. Contract deployed at the address in `VITE_LOANVERSE_V4_ADDRESS`
3. Sufficient balance in the liquidator account

## Troubleshooting

### "JsonRpcProvider failed to detect network"
- Ensure Hardhat node is running on port 8000
- Check that `RPC_URL` in `.env` is correct
- Service will automatically retry every 5 seconds

### "Could not decode result data" Error
- This is fixed! The service now uses the compiled contract ABI
- Ensure `contracts/LoanVerse.json` exists
- Verify the contract address in `VITE_LOANVERSE_V4_ADDRESS` is correct

### Module Not Found Errors
- Run `npm install` again
- Clear node_modules: `rm -rf node_modules && npm install`

## File Structure

```
backend/
├── .env                          # Environment variables (configured)
├── server.js                     # Main server file
├── hardhat.config.js            # Hardhat configuration
├── services/
│   ├── liquidationService.js    # Liquidation monitoring service
│   ├── contractService.js       # Contract interaction
│   └── connectionPools.js       # Connection pooling
├── contracts/
│   └── LoanVerse.json          # Contract ABI
└── routes/
    └── liquidation.js           # Liquidation routes
```

## Key Services

1. **Backend Server** (Port 3001)
   - Express.js API server
   - Rate limiting enabled
   - CORS configured for development

2. **Liquidation Service**
   - Monitors loans automatically
   - Uses compiled contract ABI
   - Gracefully handles connection issues

3. **Hardhat Node** (Port 8000)
   - Local blockchain for testing
   - Pre-configured with test accounts
   - 31337 chainId

## Environment Variables

Key variables in `.env`:
- `PORT` - Server port (default: 3001)
- `RPC_URL` - Blockchain RPC endpoint
- `VITE_LOANVERSE_V4_ADDRESS` - Contract address
- `LIQUIDATOR_PRIVATE_KEY` - Account for liquidations
- `NODE_ENV` - Set to 'development' for local setup

## Next Steps

1. Start the Hardhat node
2. Start the backend server
3. Check health endpoint to verify setup
4. Watch logs for "✅ Liquidation service initialized"
5. Deploy contracts if needed and update `VITE_LOANVERSE_V4_ADDRESS`
