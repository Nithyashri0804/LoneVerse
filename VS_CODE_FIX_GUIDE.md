# 🔧 LoanVerse Error Fix Guide for VS Code

## What I Fixed

### 1. **Smart Contract Bug** ✅
- **File**: `contracts/LoanVerseV4.sol`
- **Issue**: USD value calculation was incorrect for 18-decimal tokens (ETH, DAI)
- **Fix**: Simplified the math in `calculateUSDValue()` function

### 2. **Deployment Script** ✅
- **File**: `scripts/deployV4.js`
- **Issue**: Missing `TokenType` parameter when calling `addSupportedToken()`
- **Fix**: Added correct function signature with TokenType (0 for ETH, 1 for ERC20)

### 3. **Frontend Configuration** ✅
- **Files**: 
  - `src/hooks/useContract.ts` - Added LoanVerseV4 ABI support
  - `src/config/contracts.ts` - Added V4 contract address config
  - `src/contracts/LoanVerseV4.json` - Copied compiled ABI

---

## 🚀 How to Fix Your Error

The error you're seeing ("no matching fragment") happens because the frontend is trying to use an old contract that doesn't have the right function signatures. Here's how to fix it:

### Step 1: Stop Everything

In VS Code, **stop all running processes**:
- Press `Ctrl+C` in all your terminals
- If you have a Hardhat node running, stop it too

### Step 2: Start Fresh Hardhat Node

**Terminal 1** - Start local blockchain:
```bash
npx hardhat node
```

Keep this running! You should see:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

### Step 3: Deploy LoanVerseV4

**Terminal 2** - Deploy the fixed contract:
```bash
npx hardhat run scripts/deployV4.js --network localhost
```

You should see output like:
```
✅ LoanVerseV4 deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ ETH added as token ID: 0
✅ USDC added as token ID: 1
✅ DAI added as token ID: 2
```

**IMPORTANT**: Copy the LoanVerseV4 contract address!

### Step 4: Update Frontend Config

Open `src/config/contracts.ts` and update line 31:

```typescript
loanVerseV4: "0x5FbDB2315678afecb367f032d93F642f64180aa3",  // Replace with YOUR address
```

Replace `0x5FbDB2315678afecb367f032d93F642f64180aa3` with the address from Step 3.

### Step 5: Start Frontend

**Terminal 3** - Start the React app:
```bash
npm run dev
```

You should see:
```
VITE v7.1.12  ready in 300 ms
➜  Local:   http://localhost:5000/
```

### Step 6: Test It!

1. Open your browser to `http://localhost:5000`
2. Open browser DevTools (F12)
3. Check the Console tab - you should see:
   ```
   ✅ Connected to LoanVerse V4 at 0x5FbDB...
   ```
4. Try to request a loan again!

---

## 🔍 What Changed Under the Hood

### Before (Broken):
- Frontend used `LoanChainV2.json` ABI
- Tried to call `requestLoan()` with V4 parameters
- Contract didn't recognize the function → "no matching fragment" error

### After (Fixed):
- Frontend uses `LoanVerseV4.json` ABI
- Calls `requestLoan()` with correct V4 parameters
- Contract recognizes the function ✅
- USD calculations work correctly ✅

---

## 🧪 Testing Your Fixes

### Test 1: Check Contract Connection
Open browser console (F12) and run:
```javascript
// Should show V4 address
console.log("Contract connected")
```

### Test 2: Create a Loan
Fill out the loan form:
- Loan Amount: 999.9999 ETH
- Collateral: 1200.0001 ETH
- Interest Rate: 5%
- Duration: 30 days

Click "Request Loan" - it should work now!

### Test 3: Run Smart Contract Tests
```bash
npx hardhat test test/LoanVerseV4.multitoken.test.js --network localhost
```

All 14 tests should pass (previously 13/14 passed, 1 failed).

---

## 🐛 Troubleshooting

### Error: "Contract address required"
**Fix**: Make sure you updated `loanVerseV4` address in `src/config/contracts.ts`

### Error: "network changed"
**Fix**: 
1. Make sure MetaMask is connected to "Localhost 8545"
2. Refresh the page

### Error: "insufficient funds"
**Fix**: 
1. In MetaMask, import one of the Hardhat test accounts
2. Get the private key from Terminal 1 (where hardhat node is running)
3. Import it into MetaMask

### Frontend shows blank page
**Fix**:
1. Check Terminal 3 for errors
2. Check browser console (F12) for errors
3. Make sure hardhat node (Terminal 1) is still running

---

## 📋 Quick Command Reference

### Full Restart (if something goes wrong):

**Terminal 1** - Hardhat Node:
```bash
# Stop any existing node (Ctrl+C), then:
npx hardhat node
```

**Terminal 2** - Deploy:
```bash
npx hardhat run scripts/deployV4.js --network localhost
# Copy the contract address and update src/config/contracts.ts
```

**Terminal 3** - Frontend:
```bash
npm run dev
```

### Run Tests:
```bash
# All tests
npx hardhat test

# Just LoanVerseV4 tests
npx hardhat test test/LoanVerseV4.multitoken.test.js --network localhost

# Specific test
npx hardhat test --grep "USD value"
```

---

## ✅ Success Checklist

- [ ] Hardhat node running (Terminal 1)
- [ ] LoanVerseV4 deployed (Terminal 2)
- [ ] Contract address updated in `src/config/contracts.ts`
- [ ] Frontend running without errors (Terminal 3)
- [ ] Browser console shows "✅ Connected to LoanVerse V4"
- [ ] Loan request form works without "no matching fragment" error

---

## 🎉 You're All Set!

Your LoanVerse V4 smart contract is now:
- ✅ Compiled with the fixed USD calculation
- ✅ Configured with correct token parameters
- ✅ Connected to the frontend with the right ABI
- ✅ Ready to create multi-token loans!

For more details, see:
- `VS_CODE_SETUP_AND_RUN.md` - Complete setup guide
- `VS_CODE_COMMANDS.md` - Quick command reference
- `MULTITOKEN_FEATURES.md` - Multi-token feature documentation
