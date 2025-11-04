import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("LoanVerseV4 - Multi-Token Support", function () {
  let loanVerse, usdc, dai, wbtc;
  let usdcPriceFeed, daiPriceFeed, wbtcPriceFeed, ethPriceFeed;
  let owner, borrower, lender1, lender2, lender3;

  beforeEach(async function () {
    [owner, borrower, lender1, lender2, lender3] = await ethers.getSigners();

    // Deploy LoanVerseV4
    const LoanVerseV4 = await ethers.getContractFactory("LoanVerseV4");
    loanVerse = await LoanVerseV4.deploy();
    await loanVerse.waitForDeployment();

    // Deploy Mock ERC20 tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6, 1000000);
    await usdc.waitForDeployment();
    
    dai = await MockERC20.deploy("Dai Stablecoin", "DAI", 18, 1000000);
    await dai.waitForDeployment();
    
    wbtc = await MockERC20.deploy("Wrapped Bitcoin", "WBTC", 8, 10000);
    await wbtc.waitForDeployment();

    // Deploy Mock Price Feeds
    const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    
    ethPriceFeed = await MockV3Aggregator.deploy(8, 200000000000); // $2000
    await ethPriceFeed.waitForDeployment();
    
    usdcPriceFeed = await MockV3Aggregator.deploy(8, 100000000); // $1
    await usdcPriceFeed.waitForDeployment();
    
    daiPriceFeed = await MockV3Aggregator.deploy(8, 100000000); // $1
    await daiPriceFeed.waitForDeployment();
    
    wbtcPriceFeed = await MockV3Aggregator.deploy(8, 4000000000000); // $40,000
    await wbtcPriceFeed.waitForDeployment();

    // Add tokens to LoanVerse
    await loanVerse.addSupportedToken(
      await usdc.getAddress(),
      "USDC",
      6,
      await usdcPriceFeed.getAddress()
    );
    
    await loanVerse.addSupportedToken(
      await dai.getAddress(),
      "DAI",
      18,
      await daiPriceFeed.getAddress()
    );
    
    await loanVerse.addSupportedToken(
      await wbtc.getAddress(),
      "WBTC",
      8,
      await wbtcPriceFeed.getAddress()
    );

    // Distribute tokens to test accounts
    await usdc.transfer(borrower.address, ethers.parseUnits("10000", 6));
    await usdc.transfer(lender1.address, ethers.parseUnits("10000", 6));
    await usdc.transfer(lender2.address, ethers.parseUnits("10000", 6));
    await usdc.transfer(lender3.address, ethers.parseUnits("10000", 6));
    
    await dai.transfer(borrower.address, ethers.parseEther("10000"));
    await dai.transfer(lender1.address, ethers.parseEther("10000"));
    await dai.transfer(lender2.address, ethers.parseEther("10000"));
    await dai.transfer(lender3.address, ethers.parseEther("10000"));
    
    await wbtc.transfer(borrower.address, ethers.parseUnits("1", 8));
  });

  describe("Token Registration", function () {
    it("Should have ETH as token ID 0", async function () {
      const token = await loanVerse.supportedTokens(0);
      expect(token.symbol).to.equal("ETH");
      expect(token.decimals).to.equal(18);
      expect(token.isActive).to.be.true;
    });

    it("Should have USDC as token ID 1", async function () {
      const token = await loanVerse.supportedTokens(1);
      expect(token.symbol).to.equal("USDC");
      expect(token.decimals).to.equal(6);
      expect(token.isActive).to.be.true;
      expect(token.contractAddress).to.equal(await usdc.getAddress());
    });

    it("Should have DAI as token ID 2", async function () {
      const token = await loanVerse.supportedTokens(2);
      expect(token.symbol).to.equal("DAI");
      expect(token.decimals).to.equal(18);
      expect(token.isActive).to.be.true;
    });

    it("Should have WBTC as token ID 3", async function () {
      const token = await loanVerse.supportedTokens(3);
      expect(token.symbol).to.equal("WBTC");
      expect(token.decimals).to.equal(8);
      expect(token.isActive).to.be.true;
    });
  });

  describe("Price Feed Integration", function () {
    it("Should get correct ETH price", async function () {
      const [price] = await loanVerse.getLatestPrice(0);
      expect(price).to.equal(200000000000); // $2000 with 8 decimals
    });

    it("Should get correct USDC price", async function () {
      const [price] = await loanVerse.getLatestPrice(1);
      expect(price).to.equal(100000000); // $1 with 8 decimals
    });

    it("Should get correct WBTC price", async function () {
      const [price] = await loanVerse.getLatestPrice(3);
      expect(price).to.equal(4000000000000); // $40,000 with 8 decimals
    });
  });

  describe("Multi-Token Loan Scenarios", function () {
    it("Should create loan: Borrow USDC with ETH collateral", async function () {
      const loanAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      const collateralValue = ethers.parseEther("1"); // 1 ETH (~$2000)

      await expect(
        loanVerse.connect(borrower).requestLoan(
          1, // USDC
          0, // ETH collateral
          loanAmount,
          500, // 5% interest
          30 * 24 * 60 * 60, // 30 days
          ethers.parseUnits("100", 6), // Min 100 USDC contribution
          7 * 24 * 60 * 60, // 7 days funding period
          0, // No early repayment penalty
          "QmTestHash123",
          { value: collateralValue }
        )
      ).to.emit(loanVerse, "LoanRequested");

      const loan = await loanVerse.loans(1);
      expect(loan.tokenId).to.equal(1); // USDC
      expect(loan.collateralTokenId).to.equal(0); // ETH
      expect(loan.amount).to.equal(loanAmount);
    });

    it("Should create loan: Borrow DAI with USDC collateral", async function () {
      const loanAmount = ethers.parseEther("1000"); // 1000 DAI
      const collateralAmount = ethers.parseUnits("1500", 6); // 1500 USDC

      // Approve USDC
      await usdc.connect(borrower).approve(await loanVerse.getAddress(), collateralAmount);

      await expect(
        loanVerse.connect(borrower).requestLoan(
          2, // DAI
          1, // USDC collateral
          loanAmount,
          500, // 5% interest
          30 * 24 * 60 * 60, // 30 days
          ethers.parseEther("100"), // Min 100 DAI contribution
          7 * 24 * 60 * 60, // 7 days funding period
          0,
          "QmTestHash456"
        )
      ).to.emit(loanVerse, "LoanRequested");

      const loan = await loanVerse.loans(1);
      expect(loan.tokenId).to.equal(2); // DAI
      expect(loan.collateralTokenId).to.equal(1); // USDC
    });

    it("Should create loan: Borrow ETH with DAI collateral", async function () {
      const loanAmount = ethers.parseEther("0.5"); // 0.5 ETH
      const collateralAmount = ethers.parseEther("1500"); // 1500 DAI

      // Approve DAI
      await dai.connect(borrower).approve(await loanVerse.getAddress(), collateralAmount);

      await expect(
        loanVerse.connect(borrower).requestLoan(
          0, // ETH
          2, // DAI collateral
          loanAmount,
          500,
          30 * 24 * 60 * 60,
          ethers.parseEther("0.1"),
          7 * 24 * 60 * 60,
          0,
          "QmTestHash789"
        )
      ).to.emit(loanVerse, "LoanRequested");

      const loan = await loanVerse.loans(1);
      expect(loan.tokenId).to.equal(0); // ETH
      expect(loan.collateralTokenId).to.equal(2); // DAI
    });
  });

  describe("Multi-Lender Contributions with Different Tokens", function () {
    it("Should allow multiple lenders to fund USDC loan with USDC", async function () {
      const loanAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      const collateralValue = ethers.parseEther("1");

      // Borrower requests loan
      await loanVerse.connect(borrower).requestLoan(
        1, // USDC
        0, // ETH collateral
        loanAmount,
        500,
        30 * 24 * 60 * 60,
        ethers.parseUnits("100", 6),
        7 * 24 * 60 * 60,
        0,
        "QmTestHash",
        { value: collateralValue }
      );

      // Approve USDC for lenders
      await usdc.connect(lender1).approve(await loanVerse.getAddress(), ethers.parseUnits("400", 6));
      await usdc.connect(lender2).approve(await loanVerse.getAddress(), ethers.parseUnits("300", 6));
      await usdc.connect(lender3).approve(await loanVerse.getAddress(), ethers.parseUnits("300", 6));

      // Lender 1 contributes 400 USDC
      await loanVerse.connect(lender1).contributeLoan(1, ethers.parseUnits("400", 6));
      
      // Lender 2 contributes 300 USDC
      await loanVerse.connect(lender2).contributeLoan(1, ethers.parseUnits("300", 6));
      
      // Lender 3 contributes 300 USDC - should fully fund
      await expect(
        loanVerse.connect(lender3).contributeLoan(1, ethers.parseUnits("300", 6))
      ).to.emit(loanVerse, "LoanFullyFunded");

      const loan = await loanVerse.loans(1);
      expect(loan.amountFunded).to.equal(loanAmount);
      expect(loan.status).to.equal(2); // FUNDED
    });

    it("Should allow multiple lenders to fund ETH loan with ETH", async function () {
      const loanAmount = ethers.parseEther("1"); // 1 ETH
      const collateralAmount = ethers.parseUnits("3000", 6); // 3000 USDC

      // Approve USDC collateral
      await usdc.connect(borrower).approve(await loanVerse.getAddress(), collateralAmount);

      // Borrower requests loan
      await loanVerse.connect(borrower).requestLoan(
        0, // ETH
        1, // USDC collateral
        loanAmount,
        500,
        30 * 24 * 60 * 60,
        ethers.parseEther("0.1"),
        7 * 24 * 60 * 60,
        0,
        "QmTestHash"
      );

      // Three lenders contribute ETH
      await loanVerse.connect(lender1).contributeLoan(1, ethers.parseEther("0.4"), {
        value: ethers.parseEther("0.4")
      });
      
      await loanVerse.connect(lender2).contributeLoan(1, ethers.parseEther("0.3"), {
        value: ethers.parseEther("0.3")
      });
      
      await expect(
        loanVerse.connect(lender3).contributeLoan(1, ethers.parseEther("0.3"), {
          value: ethers.parseEther("0.3")
        })
      ).to.emit(loanVerse, "LoanFullyFunded");

      const loan = await loanVerse.loans(1);
      expect(loan.amountFunded).to.equal(loanAmount);
    });
  });

  describe("Token Deactivation", function () {
    it("Should prevent loans with deactivated tokens", async function () {
      // Deactivate USDC
      await loanVerse.deactivateToken(1);

      const token = await loanVerse.supportedTokens(1);
      expect(token.isActive).to.be.false;

      // Try to request loan with USDC
      await expect(
        loanVerse.connect(borrower).requestLoan(
          1, // USDC (deactivated)
          0, // ETH collateral
          ethers.parseUnits("1000", 6),
          500,
          30 * 24 * 60 * 60,
          ethers.parseUnits("100", 6),
          7 * 24 * 60 * 60,
          0,
          "QmTestHash",
          { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWith("Token not supported");
    });
  });

  describe("Cross-Token Value Calculation", function () {
    it("Should correctly calculate USD value for different tokens", async function () {
      // 1 ETH at $2000 = $2000
      const ethValue = await loanVerse.calculateUSDValue(0, ethers.parseEther("1"));
      expect(ethValue).to.be.closeTo(ethers.parseUnits("2000", 8), ethers.parseUnits("1", 8));

      // 1000 USDC at $1 = $1000
      const usdcValue = await loanVerse.calculateUSDValue(1, ethers.parseUnits("1000", 6));
      expect(usdcValue).to.be.closeTo(ethers.parseUnits("1000", 8), ethers.parseUnits("1", 8));

      // 0.1 WBTC at $40,000 = $4000
      const wbtcValue = await loanVerse.calculateUSDValue(3, ethers.parseUnits("0.1", 8));
      expect(wbtcValue).to.be.closeTo(ethers.parseUnits("4000", 8), ethers.parseUnits("1", 8));
    });
  });
});
