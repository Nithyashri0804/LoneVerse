# Contract Revert Issue - Debugging Guide

## Current Issue
The liquidation service is getting "require(false)" errors when calling `nextLoanId()` and `loans()` functions. This indicates a contract-level guard condition is failing.

## Possible Causes

### 1. Contract is Paused
The contract has a Pausable interface. If it's paused, all functions revert.

**Check if paused:**
```bash
cd backend
npx hardhat console --network localhost
```

Then in the console:
```javascript
const LoanVerse = await ethers.getContractFactory("LoanVerse");
const contract = LoanVerse.attach("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
const paused = await contract.paused();
console.log("Is paused:", paused);
```

**If paused = true, unpause it:**
```javascript
const tx = await contract.unpause();
await tx.wait();
console.log("Contract unpaused");
```

### 2. Contract Needs Initialization
The contract might require an initialization call after deployment.

### 3. Contract Owner Issue
Some functions might only be callable by the contract owner.

## What I Changed
Updated the liquidation service to:
- ✅ Silently break when hitting non-existent loans (instead of logging 100+ errors)
- ✅ Only log actual errors, not expected "require(false)" for empty loan IDs
- ✅ Stop the iteration early when no more loans exist

## Next Steps

1. **Check contract state** - Use the hardhat console to verify the contract is not paused
2. **Restart backend** - The new error handling is much cleaner
3. **If still failing** - Run the unpause command above if the contract is paused

Once the contract is in a healthy state, the liquidation service will work without all those error logs.
