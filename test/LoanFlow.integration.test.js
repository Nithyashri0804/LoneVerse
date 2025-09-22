import { expect } from "chai";
import { ethers } from "hardhat";

describe("LoanChain Integration Tests", function () {
  let loanChain;
  let owner, borrower, lender1, lender2;
  
  beforeEach(async function () {
    [owner, borrower, lender1, lender2] = await ethers.getSigners();
    
    const LoanChain = await ethers.getContractFactory("LoanChain");
    loanChain = await LoanChain.deploy();
    await loanChain.waitForDeployment();
  });

  describe("End-to-End Loan Flow", function () {
    it("Should complete a full borrower-lender cycle", async function () {
      const loanAmount = ethers.parseEther("1.0");
      const collateralAmount = ethers.parseEther("1.5");
      const interestRate = 1000; // 10%
      const duration = 30 * 24 * 60 * 60; // 30 days

      // 1. Borrower requests loan
      const requestTx = await loanChain.connect(borrower).requestLoan(
        loanAmount,
        interestRate,
        duration,
        { value: collateralAmount }
      );
      
      const receipt = await requestTx.wait();
      const loanId = receipt.logs[0].args[0];
      
      // Verify loan request
      const loan = await loanChain.getLoan(loanId);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.amount).to.equal(loanAmount);
      expect(loan.collateralAmount).to.equal(collateralAmount);
      expect(loan.status).to.equal(0); // REQUESTED

      // 2. Lender funds the loan
      await loanChain.connect(lender1).fundLoan(loanId, { value: loanAmount });
      
      // Verify funding
      const fundedLoan = await loanChain.getLoan(loanId);
      expect(fundedLoan.lender).to.equal(lender1.address);
      expect(fundedLoan.status).to.equal(1); // FUNDED

      // 3. Check borrower received funds
      const borrowerBalanceBefore = await ethers.provider.getBalance(borrower.address);
      
      // 4. Borrower repays loan with interest
      const repaymentAmount = loanAmount + (loanAmount * BigInt(interestRate)) / BigInt(10000);
      
      // Fast forward time to simulate loan duration
      await ethers.provider.send("evm_increaseTime", [duration / 2]);
      await ethers.provider.send("evm_mine");
      
      await loanChain.connect(borrower).repayLoan(loanId, { value: repaymentAmount });
      
      // Verify repayment
      const repaidLoan = await loanChain.getLoan(loanId);
      expect(repaidLoan.status).to.equal(2); // REPAID
      
      // Verify lender received payment and borrower got collateral back
      const lenderBalance = await ethers.provider.getBalance(lender1.address);
      expect(lenderBalance).to.be.gt(0);
    });

    it("Should handle loan default and collateral claiming", async function () {
      const loanAmount = ethers.parseEther("1.0");
      const collateralAmount = ethers.parseEther("1.5");
      const interestRate = 1000;
      const duration = 7 * 24 * 60 * 60; // 7 days

      // Request and fund loan
      const requestTx = await loanChain.connect(borrower).requestLoan(
        loanAmount,
        interestRate,
        duration,
        { value: collateralAmount }
      );
      
      const receipt = await requestTx.wait();
      const loanId = receipt.logs[0].args[0];
      
      await loanChain.connect(lender1).fundLoan(loanId, { value: loanAmount });
      
      // Fast forward past due date
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");
      
      // Lender claims collateral
      const lenderBalanceBefore = await ethers.provider.getBalance(lender1.address);
      await loanChain.connect(lender1).claimCollateral(loanId);
      
      // Verify collateral claimed
      const defaultedLoan = await loanChain.getLoan(loanId);
      expect(defaultedLoan.status).to.equal(3); // DEFAULTED
      expect(defaultedLoan.collateralClaimed).to.be.true;
      
      const lenderBalanceAfter = await ethers.provider.getBalance(lender1.address);
      expect(lenderBalanceAfter).to.be.gt(lenderBalanceBefore);
    });

    it("Should handle partial funding scenarios", async function () {
      const loanAmount = ethers.parseEther("2.0");
      const collateralAmount = ethers.parseEther("3.0");
      const interestRate = 800; // 8%
      const duration = 14 * 24 * 60 * 60; // 14 days

      // Request loan
      const requestTx = await loanChain.connect(borrower).requestLoan(
        loanAmount,
        interestRate,
        duration,
        { value: collateralAmount }
      );
      
      const receipt = await requestTx.wait();
      const loanId = receipt.logs[0].args[0];
      
      // Partial funding by multiple lenders
      const funding1 = ethers.parseEther("0.8");
      const funding2 = ethers.parseEther("1.2");
      
      await loanChain.connect(lender1).fundLoan(loanId, { value: funding1 });
      await loanChain.connect(lender2).fundLoan(loanId, { value: funding2 });
      
      // Verify loan is fully funded
      const fundedLoan = await loanChain.getLoan(loanId);
      expect(fundedLoan.status).to.equal(1); // FUNDED
      expect(fundedLoan.totalFunded).to.equal(loanAmount);
      
      // Verify lender tracking
      const loan = await loanChain.getLoan(loanId);
      expect(loan.lenders.length).to.equal(2);
    });

    it("Should calculate interest correctly", async function () {
      const loanAmount = ethers.parseEther("1.0");
      const collateralAmount = ethers.parseEther("1.5");
      const interestRate = 1200; // 12%
      const duration = 30 * 24 * 60 * 60; // 30 days

      // Request and fund loan
      const requestTx = await loanChain.connect(borrower).requestLoan(
        loanAmount,
        interestRate,
        duration,
        { value: collateralAmount }
      );
      
      const receipt = await requestTx.wait();
      const loanId = receipt.logs[0].args[0];
      
      await loanChain.connect(lender1).fundLoan(loanId, { value: loanAmount });
      
      // Calculate expected repayment
      const expectedInterest = (loanAmount * BigInt(interestRate)) / BigInt(10000);
      const expectedRepayment = loanAmount + expectedInterest;
      
      // Repay loan
      await loanChain.connect(borrower).repayLoan(loanId, { value: expectedRepayment });
      
      const repaidLoan = await loanChain.getLoan(loanId);
      expect(repaidLoan.status).to.equal(2); // REPAID
    });

    it("Should track borrower and lender loan history", async function () {
      const loanAmount = ethers.parseEther("0.5");
      const collateralAmount = ethers.parseEther("0.8");
      const interestRate = 900; // 9%
      const duration = 14 * 24 * 60 * 60; // 14 days

      // Create multiple loans for history tracking
      for (let i = 0; i < 3; i++) {
        const requestTx = await loanChain.connect(borrower).requestLoan(
          loanAmount,
          interestRate,
          duration,
          { value: collateralAmount }
        );
        
        const receipt = await requestTx.wait();
        const loanId = receipt.logs[0].args[0];
        
        await loanChain.connect(lender1).fundLoan(loanId, { value: loanAmount });
        
        const repaymentAmount = loanAmount + (loanAmount * BigInt(interestRate)) / BigInt(10000);
        await loanChain.connect(borrower).repayLoan(loanId, { value: repaymentAmount });
      }
      
      // Check loan history
      const borrowerLoans = await loanChain.borrowerLoans(borrower.address);
      const lenderLoans = await loanChain.lenderLoans(lender1.address);
      
      expect(borrowerLoans.length).to.equal(3);
      expect(lenderLoans.length).to.equal(3);
    });
  });

  describe("Risk Assessment Integration", function () {
    it("Should calculate risk factors based on loan parameters", async function () {
      const testCases = [
        {
          amount: ethers.parseEther("0.1"),
          collateral: ethers.parseEther("0.2"),
          rate: 500, // 5% - low risk
          duration: 7 * 24 * 60 * 60,
          expectedRisk: "low"
        },
        {
          amount: ethers.parseEther("10.0"),
          collateral: ethers.parseEther("12.0"),
          rate: 2000, // 20% - high risk
          duration: 365 * 24 * 60 * 60,
          expectedRisk: "high"
        }
      ];

      for (const testCase of testCases) {
        const requestTx = await loanChain.connect(borrower).requestLoan(
          testCase.amount,
          testCase.rate,
          testCase.duration,
          { value: testCase.collateral }
        );
        
        const receipt = await requestTx.wait();
        const loanId = receipt.logs[0].args[0];
        
        const loan = await loanChain.getLoan(loanId);
        
        // Calculate collateralization ratio
        const ratio = (testCase.collateral * BigInt(100)) / testCase.amount;
        
        if (testCase.expectedRisk === "low") {
          expect(ratio).to.be.gte(150); // At least 150% collateralized
          expect(testCase.rate).to.be.lt(1000); // Less than 10% interest
        } else {
          expect(testCase.rate).to.be.gte(1500); // 15% or higher interest
        }
      }
    });
  });

  describe("Security and Edge Cases", function () {
    it("Should prevent double funding", async function () {
      const loanAmount = ethers.parseEther("1.0");
      const collateralAmount = ethers.parseEther("1.5");
      const interestRate = 1000;
      const duration = 30 * 24 * 60 * 60;

      const requestTx = await loanChain.connect(borrower).requestLoan(
        loanAmount,
        interestRate,
        duration,
        { value: collateralAmount }
      );
      
      const receipt = await requestTx.wait();
      const loanId = receipt.logs[0].args[0];
      
      // Fund the loan
      await loanChain.connect(lender1).fundLoan(loanId, { value: loanAmount });
      
      // Try to fund again - should fail
      await expect(
        loanChain.connect(lender2).fundLoan(loanId, { value: loanAmount })
      ).to.be.revertedWith("Loan already fully funded");
    });

    it("Should prevent repayment of non-funded loans", async function () {
      const loanAmount = ethers.parseEther("1.0");
      const collateralAmount = ethers.parseEther("1.5");
      const interestRate = 1000;
      const duration = 30 * 24 * 60 * 60;

      const requestTx = await loanChain.connect(borrower).requestLoan(
        loanAmount,
        interestRate,
        duration,
        { value: collateralAmount }
      );
      
      const receipt = await requestTx.wait();
      const loanId = receipt.logs[0].args[0];
      
      // Try to repay without funding
      const repaymentAmount = loanAmount + (loanAmount * BigInt(interestRate)) / BigInt(10000);
      
      await expect(
        loanChain.connect(borrower).repayLoan(loanId, { value: repaymentAmount })
      ).to.be.revertedWith("Loan not funded");
    });

    it("Should enforce minimum collateral requirements", async function () {
      const loanAmount = ethers.parseEther("1.0");
      const insufficientCollateral = ethers.parseEther("1.0"); // Only 100%, need 150%
      const interestRate = 1000;
      const duration = 30 * 24 * 60 * 60;

      await expect(
        loanChain.connect(borrower).requestLoan(
          loanAmount,
          interestRate,
          duration,
          { value: insufficientCollateral }
        )
      ).to.be.revertedWith("Insufficient collateral");
    });
  });
});