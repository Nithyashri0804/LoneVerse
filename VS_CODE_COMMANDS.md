# LoanVerse - VS Code Quick Start Commands

## ✅ What I Fixed

1. **Smart Contract Bug**: Fixed the USD value calculation in `contracts/LoanVerseV4.sol`
   - Issue: ETH and DAI were showing $0 USD value
   - Fix: Corrected the `calculateUSDValue` function math (removed double division for 18-decimal tokens)

2. **Dependencies**: All packages are installed and ready
   - Node.js dependencies: ✅ Installed
   - Python dependencies: ✅ Installed

---

## 🚀 How to Run LoanVerse in VS Code

### Option 1: Run Everything at Once (Recommended)

Open **4 separate terminals** in VS Code and run these commands:

#### Terminal 1: Backend API (Port 3001)
```bash
cd backend
npm start
```
Expected output: `✅ Connection pools initialized` and `🌟 LoanVerse Backend running on port 3001`

#### Terminal 2: ML Service (Port 3002)
```bash
cd ml_service
python ml_api.py
```
Expected output: `✅ ML model loaded successfully` and `* Running on http://127.0.0.1:3002`

#### Terminal 3: Frontend (Port 5000)
```bash
npm run dev
```
Expected output: `VITE ready in 300 ms` and `Local: http://localhost:5000/`

#### Terminal 4 (Optional): Hardhat Local Blockchain
```bash
npx hardhat node
```
This starts a local Ethereum node on `http://localhost:8545`

---

### Option 2: Test Your Smart Contracts First

Before running the full app, test your fixed smart contract:

```bash
# Start local blockchain (Terminal 1)
npx hardhat node

# In another terminal (Terminal 2), deploy and test
npx hardhat test test/LoanVerseV4.multitoken.test.js --network localhost

# Or run the verification script
npx hardhat run scripts/verifyMultiToken.js --network localhost
```

All 14 tests should now pass (the USD calculation test that was failing is now fixed!).

---

## 🔍 Verify Everything is Working

### Check Backend API
```bash
curl http://localhost:3001/health
```

### Check ML API
```bash
curl http://localhost:3002/health
```

### Check Frontend
Open your browser to: `http://localhost:5000`

---

## 📦 If You Need to Reinstall Dependencies

### Node.js Dependencies
```bash
npm install
cd backend && npm install
```

### Python Dependencies
```bash
pip install flask flask-cors flask-sqlalchemy gunicorn joblib matplotlib numpy pandas scikit-learn seaborn psycopg2-binary
```

---

## 🛠️ Common Development Commands

### Compile Smart Contracts
```bash
npx hardhat compile
```

### Run All Tests
```bash
npx hardhat test
```

### Deploy to Local Network
```bash
npx hardhat run scripts/deployV4.js --network localhost
```

### Build Frontend for Production
```bash
npm run build
```

---

## 🐛 Troubleshooting

### Port Already in Use?
**Windows:**
```bash
# Check what's using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
# Check what's using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Backend Won't Start?
Make sure you're in the backend directory:
```bash
cd backend
npm start
```

### ML Service Won't Start?
Make sure Python dependencies are installed:
```bash
pip list | grep -E "flask|scikit-learn|pandas"
```

If missing, reinstall:
```bash
pip install flask flask-cors scikit-learn pandas numpy
```

---

## 📂 Project Structure

```
LoanVerse/
├── backend/           # Node.js Backend API (Port 3001)
├── ml_service/        # Python ML API (Port 3002)
├── src/               # React Frontend (Port 5000)
├── contracts/         # Solidity Smart Contracts
├── scripts/           # Deployment Scripts
└── test/              # Smart Contract Tests
```

---

## 🎯 Service URLs

- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:3001
- **ML API**: http://localhost:3002
- **Hardhat Node**: http://localhost:8545 (if running)

---

## ✨ Key Features Working

✅ Multi-token support (ETH, USDC, DAI, WBTC)
✅ Price feed integration (Chainlink)
✅ Cross-token value calculation (FIXED!)
✅ Multi-lender loan pooling
✅ ML risk assessment
✅ Analytics dashboard
✅ Credit scoring

---

## 📝 Next Steps

1. Start all 3 services (Backend, ML, Frontend)
2. Open http://localhost:5000 in your browser
3. Connect your wallet
4. Start testing the loan features!

For detailed setup instructions, see `VS_CODE_SETUP_AND_RUN.md`
