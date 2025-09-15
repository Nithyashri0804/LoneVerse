import { expect } from "chai";
import { ethers } from "hardhat";

describe("LoanChain", function () {
  let LoanChain;
  let loanChain;
  let owner;
  let borrower;
  let lender;
  let addrs;

  beforeEach(async function () {
    LoanChain = await ethers.getContractFactory("LoanChain");
    [owner, borrower, lender, ...addrs] = await ethers.getSigners();
    loanChain = await LoanChain.deploy();
    await loanChain.deployed();
  });

  describe("Loan Request", function () {
    it("Should allow borrower to request a loan with sufficient collateral", async function () {
      const loanAmount = ethers.utils.parseEther("1");
      const collateralAmount = ethers.utils.parseEther("1.5");
      const interestRate = 500; // 5%
      const duration = 30 * 24 * 60 * 60; // 30 days

      await expect(
        loanChain.connect(borrower).requestLoan(loanAmount, interestRate, duration, {
          value: collateralAmount,
        })
      )
        .to.emit(loanChain, "LoanRequested")
        .withArgs(1, borrower.address, loanAmount, collateralAmount, interestRate, duration);

      const loan = await loanChain.getLoan(1);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.amount).to.equal(loanAmount);
      expect(loan.collateral).to.equal(collateralAmount);
      expect(loan.status).to.equal(0); // REQUESTED
    });

    it("Should reject loan request with insufficient collateral", async function () {
      const loanAmount = ethers.utils.parseEther("1");
      const collateralAmount = ethers.utils.parseEther("1"); // Only 100% collateral
      const interestRate = 500;
      const duration = 30 * 24 * 60 * 60;

      await expect(
        loanChain.connect(borrower).requestLoan(loanAmount, interestRate, duration, {
          value: collateralAmount,
        })
      ).to.be.revertedWith("Insufficient collateral");
    });
  });

  describe("Loan Funding", function () {
    beforeEach(async function () {
      const loanAmount = ethers.utils.parseEther("1");
      const collateralAmount = ethers.utils.parseEther("1.5");
      const interestRate = 500;
      const duration = 30 * 24 * 60 * 60;

      await loanChain.connect(borrower).requestLoan(loanAmount, interestRate, duration, {
        value: collateralAmount,
      });
    });

    it("Should allow lender to fund a loan", async function () {
      const loanAmount = ethers.utils.parseEther("1");
      
      await expect(
        loanChain.connect(lender).fundLoan(1, { value: loanAmount })
      )
        .to.emit(loanChain, "LoanFunded")
        .withArgs(1, lender.address, await ethers.provider.getBlockNumber() + 1);

      const loan = await loanChain.getLoan(1);
      expect(loan.lender).to.equal(lender.address);
      expect(loan.status).to.equal(1); // FUNDED
    });

    it("Should reject funding with incorrect amount", async function () {
      const wrongAmount = ethers.utils.parseEther("0.5");
      
      await expect(
        loanChain.connect(lender).fundLoan(1, { value: wrongAmount })
      ).to.be.revertedWith("Incorrect funding amount");
    });
  });

  describe("Loan Repayment", function () {
    beforeEach(async function () {
      const loanAmount = ethers.utils.parseEther("1");
      const collateralAmount = ethers.utils.parseEther("1.5");
      const interestRate = 500;
      const duration = 30 * 24 * 60 * 60;

      await loanChain.connect(borrower).requestLoan(loanAmount, interestRate, duration, {
        value: collateralAmount,
      });
      
      await loanChain.connect(lender).fundLoan(1, { value: loanAmount });
    });

    it("Should allow borrower to repay loan with interest", async function () {
      const repaymentAmount = await loanChain.calculateRepaymentAmount(1);
      
      await expect(
        loanChain.connect(borrower).repayLoan(1, { value: repaymentAmount })
      )
        .to.emit(loanChain, "LoanRepaid")
        .withArgs(1, borrower.address, repaymentAmount);

      const loan = await loanChain.getLoan(1);
      expect(loan.status).to.equal(2); // REPAID
    });
  });
});