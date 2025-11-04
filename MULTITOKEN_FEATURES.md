# LoanVerseV4 Multi-Token Support Features

## 🎯 Overview
LoanVerseV4 supports multiple tokens for both loans and collateral, enabling flexible DeFi lending across different assets.

## ✨ Supported Features

### 1. **Multiple Token Types**
- ✅ **Native ETH** - Ethereum as loan or collateral
- ✅ **ERC20 Tokens** - Any ERC20 token (USDC, DAI, WBTC, etc.)

### 2. **Token Registration System**
```solidity
struct Token {
    TokenType tokenType;        // ETH or ERC20
    address contractAddress;    // Token contract (0x0 for ETH)
    string symbol;              // Token symbol (e.g., "USDC")
    uint8 decimals;            // Token decimals (6 for USDC, 18 for ETH/DAI)
    bool isActive;             // Can be deactivated
    AggregatorV3Interface priceFeed; // Chainlink price oracle
}
```

**Pre-configured Tokens:**
- Token ID 0: ETH (Native)
- Token ID 1: USDC (if deployed)
- Token ID 2: DAI (if deployed)

### 3. **Price Feed Integration**
- Uses **Chainlink Price Oracles** for accurate real-time pricing
- Supports any token with a Chainlink price feed
- Fallback to mock prices for testing

### 4. **Cross-Token Loan Combinations**

You can mix and match any tokens for loans and collateral:

| Loan Token | Collateral Token | Example |
|------------|------------------|---------|
| ETH | USDC | Borrow 1 ETH, provide 3000 USDC |
| USDC | ETH | Borrow 1000 USDC, provide 1 ETH |
| DAI | ETH | Borrow 1000 DAI, provide 1 ETH |
| USDC | DAI | Borrow 1000 USDC, provide 1500 DAI |
| ETH | DAI | Borrow 1 ETH, provide 3000 DAI |
| Any | Any | Mix any supported tokens |

### 5. **Automatic USD Value Calculation**
The contract automatically:
- Fetches current prices from Chainlink
- Calculates USD value of loan amounts
- Calculates USD value of collateral
- Ensures 150% minimum collateralization ratio
- Adjusts for different token decimals (6 for USDC, 18 for ETH/DAI)

### 6. **Multi-Lender Pooling Per Token**
- Multiple lenders contribute in the **loan token**
- Each lender's share tracked separately
- Proportional interest distribution in loan token
- Works with both ETH and ERC20 tokens

### 7. **Token-Specific Handling**

**For ETH:**
- Uses `msg.value` for transfers
- Native ETH send/receive
- No token approval needed

**For ERC20:**
- Uses `SafeERC20` for secure transfers
- Requires token approval before operations
- Supports any decimal precision

## 🔧 Technical Implementation

### Adding New Tokens
```javascript
// Only contract owner can add tokens
await loanVerse.addSupportedToken(
  tokenContractAddress,
  "SYMBOL",
  decimals,
  chainlinkPriceFeedAddress
);
```

### Requesting Multi-Token Loan
```javascript
await loanVerse.requestLoan(
  loanTokenId,        // 0=ETH, 1=USDC, 2=DAI, etc.
  collateralTokenId,  // 0=ETH, 1=USDC, 2=DAI, etc.
  loanAmount,
  interestRate,
  duration,
  minContribution,
  fundingPeriod,
  earlyRepaymentPenalty,
  ipfsHash,
  { value: ethAmount } // Only if collateral is ETH
);
```

### Contributing to Loans
```javascript
// For ERC20 loan tokens
await token.approve(loanVerseAddress, amount);
await loanVerse.contributeLoan(loanId, amount);

// For ETH loan tokens
await loanVerse.contributeLoan(loanId, amount, { value: amount });
```

## 🧪 Testing Multi-Token Support

### Run Comprehensive Tests
```bash
npx hardhat test test/LoanVerseV4.multitoken.test.js --network localhost
```

### Quick Verification
```bash
npx hardhat run scripts/verifyMultiToken.js --network localhost
```

This will check:
- ✅ All registered tokens
- ✅ Price feed connectivity
- ✅ USD value calculations
- ✅ Feature completeness

## 📊 Real-World Use Cases

### 1. **Stablecoin Borrowing**
- Borrow USDC using ETH collateral
- Fixed value borrowing with volatile collateral
- Common DeFi pattern

### 2. **ETH Liquidity**
- Borrow ETH using stablecoin collateral (USDC/DAI)
- Get ETH exposure while keeping stablecoin position
- Leverage without selling

### 3. **Cross-Stablecoin Lending**
- Borrow DAI with USDC collateral
- Arbitrage between stablecoins
- Yield optimization

### 4. **Multi-Asset Collateral** (Future Enhancement)
- Currently: 1 loan token, 1 collateral token
- Future: Multiple collateral tokens per loan

## 🔐 Security Features

### 1. **Collateral Protection**
- Minimum 150% collateralization ratio
- Chainlink price feeds prevent manipulation
- Liquidation threshold at 120%

### 2. **Token Validation**
- Only active tokens can be used
- Contract owner can deactivate risky tokens
- Price staleness checks (1 hour max)

### 3. **Safe Transfer Patterns**
- Uses OpenZeppelin's `SafeERC20`
- Reentrancy protection
- Pausable in emergencies

## 📈 Price Feed Details

### Mainnet Chainlink Feeds (Production)
```javascript
// ETH/USD: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
// USDC/USD: 0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6
// DAI/USD: 0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9
// WBTC/USD: 0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c
```

### Local Testing
- Uses `MockV3Aggregator` contracts
- Configurable prices for testing scenarios
- Deployed automatically by `deployV4.js`

## 🚀 Future Enhancements

### Planned Features:
1. **Multi-Collateral Loans** - Accept multiple tokens as collateral
2. **Token Swapping** - Repay in different token than borrowed
3. **Flash Loans** - Instant borrowing with same-block repayment
4. **Yield-Bearing Collateral** - Support for aTokens, cTokens
5. **Cross-Chain Support** - Bridge to other networks

## 📝 Summary

**What Works Now:**
- ✅ Borrow any token using any token as collateral
- ✅ Multiple lenders can fund loans in the loan token
- ✅ Real-time price feeds for accurate valuations
- ✅ Automatic collateral ratio calculations
- ✅ Support for both ETH and ERC20 tokens
- ✅ Different decimal precision handling

**Token Combinations Tested:**
- ETH ↔ USDC
- ETH ↔ DAI  
- USDC ↔ DAI
- USDC ↔ ETH
- DAI ↔ ETH

**All multi-token features are production-ready!** 🎉
