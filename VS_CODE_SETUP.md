# VS Code Setup Guide for LoanVerse

## Quick Start

### 1. Install Recommended Extensions
When you open this project in VS Code, you'll be prompted to install recommended extensions. Click "Install All" or install them manually:

- **Tailwind CSS IntelliSense** - Smart autocomplete for Tailwind classes
- **Prettier** - Code formatting
- **ESLint** - Code linting and error detection
- **Solidity** - Smart contract syntax highlighting
- **Hardhat Solidity** - Enhanced Solidity support
- **TypeScript** - Enhanced TypeScript support

### 2. Start Development

#### Option A: Using VS Code Tasks (Recommended)
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select "Start All Services" to start everything at once

#### Option B: Manual Start
Open 3 terminals in VS Code and run:

**Terminal 1 - Blockchain:**
```bash
npx hardhat node --port 8545
```

**Terminal 2 - Backend:**
```bash
cd backend
npm start
```

**Terminal 3 - Frontend:**
```bash
npm run dev
```

### 3. Access Your Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Blockchain**: http://localhost:8545

### 4. Deploy Smart Contracts
After starting the Hardhat node:
```bash
npx hardhat run scripts/deployV2.js --network localhost
```

## VS Code Features Configured

### 🏃‍♂️ Tasks (Ctrl+Shift+P → "Tasks: Run Task")
- **Start All Services** - Launches frontend, backend, and blockchain
- **Install Dependencies** - Installs all npm packages
- **Deploy Contracts** - Deploys smart contracts to local network
- **Build Frontend** - Creates production build
- **Run Tests** - Executes smart contract tests
- **Lint Code** - Checks code quality

### 🐛 Debugging (F5)
- **Launch Frontend (Chrome)** - Debug React app in Chrome
- **Debug Backend** - Debug Node.js backend with breakpoints
- **Attach to Backend** - Attach debugger to running backend

### ⚙️ Settings Configured
- Auto-format on save with Prettier
- ESLint auto-fix on save
- Tailwind CSS autocomplete
- Solidity syntax highlighting
- TypeScript enhanced support
- Path intellisense for easier imports

## Development Workflow

### 1. Start Fresh Development Session
```bash
# Install dependencies (first time only)
npm install
cd backend && npm install

# Start all services
# Use VS Code Task: "Start All Services"
```

### 2. Deploy Contracts
```bash
# Deploy to local network
npx hardhat run scripts/deployV2.js --network localhost
```

### 3. Development
- Frontend automatically reloads on changes (Hot Module Reload)
- Backend restarts automatically (if using nodemon)
- Smart contracts need redeployment after changes

### 4. Testing
```bash
# Run smart contract tests
npx hardhat test --network localhost

# Lint code
npm run lint
```

## Environment Configuration

### Local Development (.env)
Copy `.env.example` to `.env` and configure:

```bash
# Copy environment template
cp .env.example .env

# Edit with your settings
# Most defaults work for local development
```

### Key Environment Variables
- `VITE_HARDHAT_LOANVERSE_ADDRESS` - Main contract address
- `RPC_URL` - Blockchain RPC endpoint (localhost:8545)
- `FRONTEND_URL` - Frontend URL (localhost:5173)
- `PORT` - Backend port (3001)

## Troubleshooting

### Port Conflicts
If ports are already in use:
- Frontend: Change port in `vite.config.ts`
- Backend: Change PORT in `.env`
- Blockchain: Use `--port` flag with hardhat node

### VS Code Extensions Not Working
1. Reload VS Code window: `Ctrl+Shift+P` → "Developer: Reload Window"
2. Check if extensions are installed and enabled
3. Restart TypeScript service: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

### Smart Contract Changes
After modifying smart contracts:
1. Stop Hardhat node
2. Delete `artifacts/` and `cache/` folders
3. Restart Hardhat node
4. Redeploy contracts

## VS Code Tips

### Useful Shortcuts
- `Ctrl+Shift+P` - Command Palette
- `Ctrl+`` - Toggle Terminal
- `F5` - Start Debugging
- `Ctrl+Shift+F` - Global Search
- `Ctrl+P` - Quick File Open

### Debugging React Components
1. Start "Launch Frontend (Chrome)" debug configuration
2. Set breakpoints in your React components
3. Interact with the app in the opened Chrome window

### Debugging Backend API
1. Start backend with "Debug Backend" configuration
2. Set breakpoints in `backend/server.js` or route files
3. Test API endpoints to trigger breakpoints

## Project Structure
```
├── .vscode/                 # VS Code configurations
├── backend/                 # Express.js API server
├── contracts/              # Solidity smart contracts
├── scripts/                # Deployment scripts
├── src/                    # React frontend source
├── test/                   # Smart contract tests
├── vite.config.ts          # Vite configuration
├── hardhat.config.js       # Hardhat configuration
└── package.json            # Dependencies and scripts
```

Happy coding! 🚀