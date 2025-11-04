# VS Code Setup and Run Instructions

## Complete Guide to Running LoanVerse Project Locally in VS Code

This guide provides step-by-step instructions to set up and run the complete LoanVerse DeFi lending platform on your local machine using VS Code.

---

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **Python** (3.11) - [Download](https://www.python.org/)
3. **Git** - [Download](https://git-scm.com/)
4. **VS Code** - [Download](https://code.visualstudio.com/)
5. **PostgreSQL** (optional, for database features) - [Download](https://www.postgresql.org/)
6. **Redis** (optional, for caching) - [Download](https://redis.io/)

---

## Step 1: Clone and Open Project

```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd loanverse

# Open in VS Code
code .
```

---

## Step 2: Install Dependencies

### A. Backend Dependencies (Node.js)
```bash
# Install main project dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### B. Python Dependencies (ML Service)
```bash
# Install Python dependencies using pip
pip install -r requirements.txt

# Or if you have specific Python packages
pip install flask flask-cors flask-sqlalchemy gunicorn joblib matplotlib numpy pandas scikit-learn seaborn psycopg2-binary
```

---

## Step 3: Environment Configuration

### Create Environment Variables

Create a `.env` file in the **root directory**:

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` with the following minimal configuration:

```env
# Backend API Configuration
PORT=3001
NODE_ENV=development

# ML Service Configuration
ML_SERVICE_URL=http://localhost:3002

# Blockchain Configuration (optional - for local testing)
RPC_URL=http://localhost:8000
LOANVERSE_CONTRACT_ADDRESS=your_contract_address_here

# Optional: API Keys (get these from respective services)
ETHERSCAN_API_KEY=your_etherscan_key
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret
GEMINI_API_KEY=your_gemini_key

# Optional: Database (if using PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/loanverse

# Optional: Redis (if using caching)
REDIS_URL=redis://localhost:6379

# Optional: Database Pool Configuration
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600

# Security
SESSION_SECRET=your_random_secret_key_here
```

Create a `.env` file in the **backend** directory (or it will use the root .env):

```env
# Same as above, backend will read from root .env
```

---

## Step 4: Running the Application

You have multiple options to run the application:

### Option A: Run All Services Manually (Recommended for VS Code)

Open **3 separate terminals** in VS Code (Terminal → New Terminal):

#### Terminal 1: Backend API
```bash
cd backend
npm start
```

You should see:
```
✅ Connection pools initialized
🌟 LoanVerse Backend running on port 3001
```

#### Terminal 2: ML API
```bash
cd ml_service
python ml_api.py
```

You should see:
```
✅ Database pool configured
✅ ML model loaded successfully
 * Running on http://127.0.0.1:3002
```

#### Terminal 3: Frontend
```bash
npm run dev
```

You should see:
```
VITE v7.1.12  ready in 300 ms
➜  Local:   http://localhost:5000/
```

### Option B: Using NPM Scripts (Alternative)

You can create a `package.json` script to run all services:

```json
{
  "scripts": {
    "dev:backend": "cd backend && npm start",
    "dev:ml": "python ml_service/ml_api.py",
    "dev:frontend": "vite --host 0.0.0.0 --port 5000",
    "dev:all": "concurrently \"npm run dev:backend\" \"npm run dev:ml\" \"npm run dev:frontend\""
  }
}
```

Then install concurrently:
```bash
npm install --save-dev concurrently
```

And run:
```bash
npm run dev:all
```

---

## Step 5: Verify Services Are Running

### Check Backend API:
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-04T13:55:00.000Z",
  "version": "1.0.0",
  "services": {
    "ml": "enabled",
    "liquidation": "disabled"
  }
}
```

### Check ML API:
```bash
curl http://localhost:3002/health
```

Expected response:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "service": "ML Risk Assessment Service"
}
```

### Check Frontend:
Open browser to: `http://localhost:5000`

---

## Step 6: Test Connection Pooling

### Backend Pool Stats:
```bash
curl http://localhost:3001/api/pools/stats
```

Expected response:
```json
{
  "success": true,
  "pools": {
    "http": {
      "maxSockets": 50,
      "maxFreeSockets": 10
    },
    "redis": {
      "connected": false
    },
    "blockchain": {
      "activeProviders": 1
    }
  }
}
```

### ML API Pool Stats:
```bash
curl http://localhost:3002/pool/stats
```

Expected response:
```json
{
  "status": "active",
  "pool_configured": true,
  "size": 10,
  "checked_in": 10,
  "checked_out": 0
}
```

---

## Step 7: Optional Services

### A. Redis Cache (Optional but Recommended)

**Windows**:
1. Download Redis from [https://github.com/tporadowski/redis/releases](https://github.com/tporadowski/redis/releases)
2. Extract and run `redis-server.exe`

**macOS**:
```bash
brew install redis
brew services start redis
```

**Linux**:
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

**Verify**:
```bash
redis-cli ping
# Should return: PONG
```

### B. PostgreSQL Database (Optional)

**Windows/macOS/Linux**:
1. Install PostgreSQL from [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
2. Create database:
```bash
createdb loanverse
```

3. Update `DATABASE_URL` in `.env`:
```env
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/loanverse
```

### C. Local Hardhat Node (For Blockchain Testing)

Open a **4th terminal**:

```bash
npx hardhat node
```

This starts a local Ethereum node on `http://localhost:8545`

---

## Step 8: VS Code Extensions (Recommended)

Install these VS Code extensions for better development experience:

1. **ESLint** - For JavaScript linting
2. **Python** - For Python support
3. **Pylance** - Advanced Python IntelliSense
4. **Thunder Client** or **REST Client** - For API testing
5. **GitLens** - Git integration
6. **Prettier** - Code formatting

---

## Troubleshooting

### Issue: Backend won't start
**Solution**: Check if port 3001 is already in use:
```bash
# Windows
netstat -ano | findstr :3001

# macOS/Linux
lsof -i :3001
```

Kill the process or change port in `.env`

### Issue: ML API won't start
**Solution**: Check Python dependencies:
```bash
pip list | grep -E "flask|scikit-learn|pandas"
```

Reinstall if missing:
```bash
pip install flask flask-cors scikit-learn pandas numpy
```

### Issue: Frontend shows blank page
**Solution**: Check browser console for errors. Most common issue is CORS - ensure backend is running first.

### Issue: Redis connection errors
**Solution**: Redis is optional. The system will work without it:
```
⚠️ Running without Redis cache
```

If you want to use Redis, ensure it's running:
```bash
redis-cli ping
```

### Issue: Database connection errors
**Solution**: Database is optional for ML features. If using database:
1. Ensure PostgreSQL is running
2. Verify DATABASE_URL in `.env`
3. Create the database if it doesn't exist

---

## Development Workflow

### 1. Start all services (3 terminals)
```bash
# Terminal 1
cd backend && npm start

# Terminal 2
python ml_service/ml_api.py

# Terminal 3
npm run dev
```

### 2. Make your changes in VS Code

### 3. Services will auto-reload on file changes:
- Backend: Restarts on changes (using nodemon if configured)
- ML API: Restarts on changes (Flask debug mode)
- Frontend: Hot reloads (Vite HMR)

### 4. Test your changes:
- Frontend: Open `http://localhost:5000` in browser
- Backend API: Use Thunder Client or `curl`
- ML API: Use Thunder Client or `curl`

---

## Production Build

### Build Frontend:
```bash
npm run build
```

Output will be in `dist/` folder

### Run Backend in Production Mode:
```bash
cd backend
NODE_ENV=production npm start
```

### Run ML API in Production Mode:
```bash
gunicorn --bind 0.0.0.0:3002 --workers 4 ml_service.ml_api:app
```

---

## Project Structure

```
loanverse/
├── backend/                 # Node.js Backend API (Port 3001)
│   ├── routes/             # API routes
│   ├── services/           # Business logic & connection pools
│   ├── contracts/          # Smart contract ABIs
│   └── server.js           # Main server file
│
├── ml_service/             # Python ML API (Port 3002)
│   ├── models/             # Trained ML models
│   ├── data/               # Training data
│   ├── ml_api.py           # Main Flask app
│   ├── db_pool.py          # Database pooling
│   └── logistic_model.py   # ML model logic
│
├── src/                    # React Frontend (Port 5000)
│   ├── components/         # React components
│   ├── hooks/              # Custom hooks
│   ├── services/           # Frontend services
│   └── App.tsx             # Main app component
│
├── contracts/              # Solidity smart contracts
├── scripts/                # Deployment scripts
└── test/                   # Test files
```

---

## Quick Reference

### Service URLs:
- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:3001
- **ML API**: http://localhost:3002
- **Hardhat Node**: http://localhost:8545 (if running)

### Key API Endpoints:
- **Health Check**: GET /health
- **Pool Stats**: GET /api/pools/stats (Backend), GET /pool/stats (ML)
- **Credit Score**: POST /api/credit-score/analyze
- **ML Prediction**: POST /api/ml/predict
- **Chatbot**: POST /api/chatbot/message

### Environment Variables Reference:
See `.env.example` for all available options

---

## Support

If you encounter any issues:

1. Check this documentation first
2. Review the logs in each terminal
3. Check `POOLING_IMPLEMENTATION.md` for pooling-specific details
4. Ensure all dependencies are installed
5. Verify all required services are running

---

## Summary

**Minimum Required to Run**:
1. Install Node.js and Python dependencies
2. Run Backend API (Terminal 1)
3. Run ML API (Terminal 2)
4. Run Frontend (Terminal 3)
5. Open browser to http://localhost:5000

**Optional but Recommended**:
- Redis (for caching)
- PostgreSQL (for database features)
- Hardhat Node (for blockchain testing)

**Connection Pooling** is now active and optimizing all services automatically! 🚀

The system works great without Redis and PostgreSQL - they just provide additional features and performance improvements.
