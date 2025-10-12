// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// Chainlink Price Feed Interface
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/**
 * @title LoanVerseV3
 * @dev Advanced DeFi lending platform with Chainlink oracles and automated liquidation
 */
contract LoanVerseV3 is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;
    
    enum LoanStatus { 
        REQUESTED,      // Loan requested by borrower
        FUNDED,         // Loan funded by lender
        REPAID,         // Loan fully repaid
        DEFAULTED,      // Loan defaulted (collateral liquidated)
        CANCELLED,      // Loan cancelled by borrower
        LIQUIDATING     // Collateral being liquidated
    }
    
    enum TokenType {
        ETH,
        ERC20
    }
    
    struct Token {
        TokenType tokenType;
        address contractAddress;  // 0x0 for ETH
        string symbol;
        uint8 decimals;
        bool isActive;
        AggregatorV3Interface priceFeed; // Chainlink price feed
    }
    
    struct CreditScore {
        uint256 score;           // 300-850 credit score (standard credit score range)
        uint256 totalLoansCount;
        uint256 repaidLoansCount;
        uint256 defaultedLoansCount;
        uint256 totalBorrowed;
        uint256 totalRepaid;
        uint256 lastUpdated;
    }
    
    struct Loan {
        uint256 id;
        address borrower;
        address lender;
        uint256 tokenId;          // ID of the token being borrowed
        uint256 collateralTokenId; // ID of the collateral token
        uint256 amount;           // Loan amount
        uint256 collateralAmount; // Collateral amount
        uint256 interestRate;     // Interest rate (basis points)
        uint256 duration;         // Loan duration in seconds
        uint256 createdAt;
        uint256 fundedAt;
        uint256 dueDate;
        LoanStatus status;
        string ipfsDocumentHash;  // IPFS hash for loan documents
        uint256 riskScore;        // AI-calculated risk score (0-1000)
        bool collateralClaimed;
        uint256 liquidationThreshold; // Liquidation threshold percentage (e.g., 120%)
        uint256 lastHealthCheck;  // Last time collateral health was checked
    }

    struct LiquidationAuction {
        uint256 loanId;
        uint256 startTime;
        uint256 endTime;
        uint256 startingPrice;
        uint256 reservePrice;
        address highestBidder;
        uint256 highestBid;
        bool active;
    }
    
    // State variables
    uint256 public nextLoanId = 1;
    uint256 public nextTokenId = 1;
    uint256 public nextAuctionId = 1;
    uint256 public constant MIN_COLLATERAL_RATIO = 150; // 150%
    uint256 public constant LIQUIDATION_THRESHOLD = 120; // 120%
    uint256 public constant MAX_INTEREST_RATE = 3000;   // 30% max
    uint256 public constant MIN_LOAN_DURATION = 1 days;
    uint256 public constant MAX_LOAN_DURATION = 365 days;
    uint256 public constant MIN_CREDIT_SCORE = 300; // Minimum credit score (300-850 range)
    uint256 public constant AUCTION_DURATION = 24 hours; // 24 hour auctions
    uint256 public constant PRICE_STALENESS_THRESHOLD = 3600; // 1 hour
    
    // Protocol fees
    uint256 public protocolFeeRate = 50; // 0.5% in basis points
    uint256 public liquidationFeeRate = 300; // 3% liquidation fee
    address public feeRecipient;
    uint256 public collectedFees;
    
    // Dynamic interest rate parameters
    uint256 public baseInterestRate = 500; // 5% base rate
    uint256 public utilizationOptimal = 8000; // 80% optimal utilization
    uint256 public rateSlope1 = 400; // 4% increase before optimal
    uint256 public rateSlope2 = 6000; // 60% increase after optimal
    
    // Mappings
    mapping(uint256 => Loan) public loans;
    mapping(uint256 => Token) public supportedTokens;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderLoans;
    mapping(address => CreditScore) public creditScores;
    mapping(address => bool) public authorizedRiskOracles;
    mapping(uint256 => LiquidationAuction) public liquidationAuctions;
    mapping(uint256 => uint256) public tokenUtilization; // Track utilization for dynamic rates
    
    // Events
    event TokenAdded(uint256 indexed tokenId, address indexed contractAddress, string symbol, address priceFeed);
    event TokenDeactivated(uint256 indexed tokenId);
    
    event LoanRequested(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 collateralAmount,
        uint256 interestRate,
        uint256 duration,
        string ipfsHash
    );
    
    event LoanFunded(uint256 indexed loanId, address indexed lender);
    event LoanRepaid(uint256 indexed loanId, uint256 repaidAmount);
    event LoanDefaulted(uint256 indexed loanId);
    event LoanCancelled(uint256 indexed loanId);
    event CollateralClaimed(uint256 indexed loanId, uint256 amount);
    event LiquidationTriggered(uint256 indexed loanId, uint256 currentRatio, uint256 threshold);
    event AuctionStarted(uint256 indexed auctionId, uint256 indexed loanId, uint256 startingPrice, uint256 endTime);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionFinalized(uint256 indexed auctionId, address indexed winner, uint256 finalPrice);
    
    event CreditScoreUpdated(address indexed borrower, uint256 newScore);
    event RiskScoreUpdated(uint256 indexed loanId, uint256 riskScore);
    event InterestRateUpdated(uint256 indexed tokenId, uint256 newRate);
    
    modifier onlyAuthorizedOracle() {
        require(authorizedRiskOracles[msg.sender], "Not authorized oracle");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        feeRecipient = msg.sender;
        
        // Add ETH as the first supported token (no price feed needed for ETH/USD on mainnet)
        supportedTokens[0] = Token({
            tokenType: TokenType.ETH,
            contractAddress: address(0),
            symbol: "ETH",
            decimals: 18,
            isActive: true,
            priceFeed: AggregatorV3Interface(address(0)) // Will be set later with actual Chainlink feed
        });
    }
    
    /**
     * @dev Add a new supported ERC20 token with Chainlink price feed
     */
    function addSupportedToken(
        address _contractAddress,
        string memory _symbol,
        uint8 _decimals,
        address _priceFeedAddress
    ) external onlyOwner {
        require(_contractAddress != address(0), "Invalid contract address");
        require(_priceFeedAddress != address(0), "Invalid price feed address");
        
        supportedTokens[nextTokenId] = Token({
            tokenType: TokenType.ERC20,
            contractAddress: _contractAddress,
            symbol: _symbol,
            decimals: _decimals,
            isActive: true,
            priceFeed: AggregatorV3Interface(_priceFeedAddress)
        });
        
        emit TokenAdded(nextTokenId, _contractAddress, _symbol, _priceFeedAddress);
        nextTokenId++;
    }
    
    /**
     * @dev Update price feed for a token
     */
    function updatePriceFeed(uint256 _tokenId, address _priceFeedAddress) external onlyOwner {
        require(supportedTokens[_tokenId].isActive, "Token not active");
        supportedTokens[_tokenId].priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }
    
    /**
     * @dev Get latest price from Chainlink oracle
     */
    function getLatestPrice(uint256 _tokenId) public view returns (uint256, uint256) {
        Token memory token = supportedTokens[_tokenId];
        require(token.isActive, "Token not supported");
        
        if (address(token.priceFeed) == address(0)) {
            // For tokens without price feed (like ETH in testnet), return mock price
            return (200000000000, block.timestamp); // $2000 USD with 8 decimals
        }
        
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = token.priceFeed.latestRoundData();
        
        require(price > 0, "Invalid price from oracle");
        require(updatedAt > 0, "Round not complete");
        require(block.timestamp - updatedAt <= PRICE_STALENESS_THRESHOLD, "Price data too old");
        
        return (uint256(price), updatedAt);
    }
    
    /**
     * @dev Calculate USD value of token amount
     */
    function calculateUSDValue(uint256 _tokenId, uint256 _amount) public view returns (uint256) {
        (uint256 price, ) = getLatestPrice(_tokenId);
        Token memory token = supportedTokens[_tokenId];
        
        // Adjust for token decimals and price feed decimals (8)
        if (token.decimals <= 8) {
            return (_amount * price) / (10 ** token.decimals);
        } else {
            return (_amount * price) / (10 ** token.decimals) / (10 ** (token.decimals - 8));
        }
    }
    
    /**
     * @dev Check if loan is underwater (collateral < threshold)
     */
    function isLoanUnderwater(uint256 _loanId) public view returns (bool, uint256) {
        Loan memory loan = loans[_loanId];
        require(loan.borrower != address(0), "Loan does not exist");
        require(loan.status == LoanStatus.FUNDED, "Loan not active");
        
        uint256 collateralValueUSD = calculateUSDValue(loan.collateralTokenId, loan.collateralAmount);
        uint256 loanValueUSD = calculateUSDValue(loan.tokenId, loan.amount);
        
        uint256 currentRatio = (collateralValueUSD * 100) / loanValueUSD;
        
        return (currentRatio < loan.liquidationThreshold, currentRatio);
    }
    
    /**
     * @dev Calculate dynamic interest rate based on utilization
     */
    function calculateDynamicRate(uint256 _tokenId) public view returns (uint256) {
        uint256 utilization = tokenUtilization[_tokenId];
        
        if (utilization <= utilizationOptimal) {
            // Below optimal: rate increases linearly
            uint256 excessUtilization = (utilization * 10000) / utilizationOptimal;
            return baseInterestRate + (rateSlope1 * excessUtilization) / 10000;
        } else {
            // Above optimal: steep increase
            uint256 excessUtilization = utilization - utilizationOptimal;
            return baseInterestRate + rateSlope1 + (rateSlope2 * excessUtilization) / (10000 - utilizationOptimal);
        }
    }
    
    /**
     * @dev Request a loan with dynamic interest rate
     */
    function requestLoan(
        uint256 _tokenId,
        uint256 _collateralTokenId,
        uint256 _amount,
        uint256 _maxInterestRate,
        uint256 _duration,
        string memory _ipfsDocumentHash
    ) external payable nonReentrant whenNotPaused {
        require(_amount > 0, "Amount must be greater than 0");
        require(_duration >= MIN_LOAN_DURATION && _duration <= MAX_LOAN_DURATION, "Invalid duration");
        require(supportedTokens[_tokenId].isActive, "Token not supported");
        require(supportedTokens[_collateralTokenId].isActive, "Collateral token not supported");
        require(bytes(_ipfsDocumentHash).length > 0, "IPFS hash required");
        
        // Check minimum credit score
        require(creditScores[msg.sender].score >= MIN_CREDIT_SCORE || 
                creditScores[msg.sender].totalLoansCount == 0, "Credit score too low");
        
        // Calculate dynamic interest rate
        uint256 dynamicRate = calculateDynamicRate(_tokenId);
        require(dynamicRate <= _maxInterestRate, "Interest rate too high");
        
        // Calculate required collateral using current prices
        uint256 loanValueUSD = calculateUSDValue(_tokenId, _amount);
        uint256 requiredCollateralUSD = (loanValueUSD * MIN_COLLATERAL_RATIO) / 100;
        
        (uint256 collateralPrice, ) = getLatestPrice(_collateralTokenId);
        Token memory collateralToken = supportedTokens[_collateralTokenId];
        uint256 requiredCollateral = (requiredCollateralUSD * (10 ** collateralToken.decimals)) / collateralPrice;
        
        if (supportedTokens[_collateralTokenId].tokenType == TokenType.ETH) {
            require(msg.value >= requiredCollateral, "Insufficient ETH collateral");
        } else {
            require(msg.value == 0, "ETH not needed for ERC20 collateral");
            IERC20 collateralTokenContract = IERC20(supportedTokens[_collateralTokenId].contractAddress);
            require(collateralTokenContract.balanceOf(msg.sender) >= requiredCollateral, "Insufficient ERC20 balance");
            collateralTokenContract.safeTransferFrom(msg.sender, address(this), requiredCollateral);
        }
        
        uint256 loanId = nextLoanId++;
        
        loans[loanId] = Loan({
            id: loanId,
            borrower: msg.sender,
            lender: address(0),
            tokenId: _tokenId,
            collateralTokenId: _collateralTokenId,
            amount: _amount,
            collateralAmount: supportedTokens[_collateralTokenId].tokenType == TokenType.ETH ? 
                              msg.value : requiredCollateral,
            interestRate: dynamicRate,
            duration: _duration,
            createdAt: block.timestamp,
            fundedAt: 0,
            dueDate: 0,
            status: LoanStatus.REQUESTED,
            ipfsDocumentHash: _ipfsDocumentHash,
            riskScore: 0,
            collateralClaimed: false,
            liquidationThreshold: LIQUIDATION_THRESHOLD,
            lastHealthCheck: block.timestamp
        });
        
        borrowerLoans[msg.sender].push(loanId);
        
        emit LoanRequested(
            loanId, 
            msg.sender, 
            _tokenId, 
            _amount, 
            loans[loanId].collateralAmount, 
            dynamicRate, 
            _duration,
            _ipfsDocumentHash
        );
    }
    
    /**
     * @dev Fund a loan
     */
    function fundLoan(uint256 _loanId) external payable nonReentrant whenNotPaused {
        Loan storage loan = loans[_loanId];
        require(loan.borrower != address(0), "Loan does not exist");
        require(loan.status == LoanStatus.REQUESTED, "Loan not available");
        require(msg.sender != loan.borrower, "Cannot fund own loan");
        
        loan.lender = msg.sender;
        loan.status = LoanStatus.FUNDED;
        loan.fundedAt = block.timestamp;
        loan.dueDate = block.timestamp + loan.duration;
        
        lenderLoans[msg.sender].push(_loanId);
        
        // Update utilization
        tokenUtilization[loan.tokenId] += loan.amount;
        
        if (supportedTokens[loan.tokenId].tokenType == TokenType.ETH) {
            require(msg.value == loan.amount, "Incorrect ETH amount");
            (bool success, ) = payable(loan.borrower).call{value: loan.amount}("");
            require(success, "Transfer to borrower failed");
        } else {
            require(msg.value == 0, "ETH not needed for ERC20 loan");
            IERC20 token = IERC20(supportedTokens[loan.tokenId].contractAddress);
            token.safeTransferFrom(msg.sender, loan.borrower, loan.amount);
        }
        
        emit LoanFunded(_loanId, msg.sender);
        emit InterestRateUpdated(loan.tokenId, calculateDynamicRate(loan.tokenId));
    }
    
    /**
     * @dev Trigger liquidation for underwater loan
     */
    function liquidateLoan(uint256 _loanId) external nonReentrant {
        (bool underwater, uint256 currentRatio) = isLoanUnderwater(_loanId);
        require(underwater, "Loan is not underwater");
        
        Loan storage loan = loans[_loanId];
        loan.status = LoanStatus.LIQUIDATING;
        
        // Start liquidation auction
        uint256 auctionId = startLiquidationAuction(_loanId);
        
        emit LiquidationTriggered(_loanId, currentRatio, loan.liquidationThreshold);
    }
    
    /**
     * @dev Start liquidation auction
     */
    function startLiquidationAuction(uint256 _loanId) internal returns (uint256) {
        Loan memory loan = loans[_loanId];
        
        // Calculate starting price (current collateral value)
        uint256 collateralValueUSD = calculateUSDValue(loan.collateralTokenId, loan.collateralAmount);
        uint256 startingPrice = collateralValueUSD;
        uint256 reservePrice = (collateralValueUSD * 80) / 100; // 80% of current value
        
        uint256 auctionId = nextAuctionId++;
        
        liquidationAuctions[auctionId] = LiquidationAuction({
            loanId: _loanId,
            startTime: block.timestamp,
            endTime: block.timestamp + AUCTION_DURATION,
            startingPrice: startingPrice,
            reservePrice: reservePrice,
            highestBidder: address(0),
            highestBid: 0,
            active: true
        });
        
        emit AuctionStarted(auctionId, _loanId, startingPrice, block.timestamp + AUCTION_DURATION);
        
        return auctionId;
    }
    
    /**
     * @dev Place bid in liquidation auction
     */
    function placeBid(uint256 _auctionId) external payable nonReentrant {
        LiquidationAuction storage auction = liquidationAuctions[_auctionId];
        require(auction.active, "Auction not active");
        require(block.timestamp <= auction.endTime, "Auction ended");
        require(msg.value > auction.highestBid, "Bid too low");
        require(msg.value >= auction.reservePrice, "Bid below reserve");
        
        // Refund previous highest bidder
        if (auction.highestBidder != address(0)) {
            (bool success, ) = payable(auction.highestBidder).call{value: auction.highestBid}("");
            require(success, "Refund failed");
        }
        
        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;
        
        emit BidPlaced(_auctionId, msg.sender, msg.value);
    }
    
    /**
     * @dev Finalize liquidation auction
     */
    function finalizeAuction(uint256 _auctionId) external nonReentrant {
        LiquidationAuction storage auction = liquidationAuctions[_auctionId];
        require(auction.active, "Auction not active");
        require(block.timestamp > auction.endTime, "Auction still ongoing");
        
        auction.active = false;
        
        Loan storage loan = loans[auction.loanId];
        
        if (auction.highestBidder != address(0)) {
            // Successful auction
            loan.status = LoanStatus.DEFAULTED;
            loan.collateralClaimed = true;
            
            // Calculate payments
            uint256 loanValueUSD = calculateUSDValue(loan.tokenId, loan.amount);
            uint256 interest = (loan.amount * loan.interestRate) / 10000;
            uint256 totalOwed = loan.amount + interest;
            uint256 liquidationFee = (auction.highestBid * liquidationFeeRate) / 10000;
            
            // Pay lender (up to amount owed)
            uint256 lenderPayment = totalOwed < auction.highestBid ? totalOwed : auction.highestBid;
            if (supportedTokens[loan.tokenId].tokenType == TokenType.ETH) {
                (bool success1, ) = payable(loan.lender).call{value: lenderPayment}("");
                require(success1, "Lender payment failed");
            }
            
            // Pay protocol fee
            collectedFees += liquidationFee;
            
            // Remaining goes to borrower (if any)
            uint256 remaining = auction.highestBid - lenderPayment - liquidationFee;
            if (remaining > 0) {
                (bool success2, ) = payable(loan.borrower).call{value: remaining}("");
                require(success2, "Borrower payment failed");
            }
            
            // Transfer collateral to auction winner
            if (supportedTokens[loan.collateralTokenId].tokenType == TokenType.ETH) {
                (bool success3, ) = payable(auction.highestBidder).call{value: loan.collateralAmount}("");
                require(success3, "Collateral transfer failed");
            } else {
                IERC20 collateralToken = IERC20(supportedTokens[loan.collateralTokenId].contractAddress);
                collateralToken.safeTransfer(auction.highestBidder, loan.collateralAmount);
            }
            
            emit AuctionFinalized(_auctionId, auction.highestBidder, auction.highestBid);
        } else {
            // No bids - return collateral to borrower, loan remains defaulted
            loan.status = LoanStatus.DEFAULTED;
            _returnCollateral(auction.loanId);
        }
        
        // Update utilization
        tokenUtilization[loan.tokenId] -= loan.amount;
        
        // Update credit score for default
        _updateCreditScore(loan.borrower, false);
        
        emit LoanDefaulted(auction.loanId);
        emit InterestRateUpdated(loan.tokenId, calculateDynamicRate(loan.tokenId));
    }
    
    /**
     * @dev Repay a loan with interest
     */
    function repayLoan(uint256 _loanId) external payable nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Only borrower can repay");
        require(loan.status == LoanStatus.FUNDED, "Loan not active");
        require(block.timestamp <= loan.dueDate, "Loan expired");
        
        uint256 interest = (loan.amount * loan.interestRate) / 10000;
        uint256 protocolFee = (interest * protocolFeeRate) / 10000;
        uint256 lenderPayment = loan.amount + interest - protocolFee;
        uint256 totalRepayment = loan.amount + interest;
        
        loan.status = LoanStatus.REPAID;
        collectedFees += protocolFee;
        
        // Update utilization
        tokenUtilization[loan.tokenId] -= loan.amount;
        
        if (supportedTokens[loan.tokenId].tokenType == TokenType.ETH) {
            require(msg.value >= totalRepayment, "Insufficient repayment");
            
            (bool success1, ) = payable(loan.lender).call{value: lenderPayment}("");
            require(success1, "Transfer to lender failed");
            
            if (msg.value > totalRepayment) {
                (bool success2, ) = payable(msg.sender).call{value: msg.value - totalRepayment}("");
                require(success2, "Excess return failed");
            }
        } else {
            require(msg.value == 0, "ETH not needed for ERC20 repayment");
            IERC20 token = IERC20(supportedTokens[loan.tokenId].contractAddress);
            token.safeTransferFrom(msg.sender, loan.lender, lenderPayment);
            if (protocolFee > 0) {
                token.safeTransferFrom(msg.sender, feeRecipient, protocolFee);
            }
        }
        
        // Return collateral
        _returnCollateral(_loanId);
        
        // Update credit score
        _updateCreditScore(loan.borrower, true);
        
        emit LoanRepaid(_loanId, totalRepayment);
        emit InterestRateUpdated(loan.tokenId, calculateDynamicRate(loan.tokenId));
    }
    
    /**
     * @dev Internal function to return collateral
     */
    function _returnCollateral(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        
        if (supportedTokens[loan.collateralTokenId].tokenType == TokenType.ETH) {
            (bool success, ) = payable(loan.borrower).call{value: loan.collateralAmount}("");
            require(success, "Collateral return failed");
        } else {
            IERC20 collateralToken = IERC20(supportedTokens[loan.collateralTokenId].contractAddress);
            collateralToken.safeTransfer(loan.borrower, loan.collateralAmount);
        }
    }
    
    /**
     * @dev Internal function to update credit score
     */
    function _updateCreditScore(address _borrower, bool _repaid) internal {
        CreditScore storage score = creditScores[_borrower];
        
        if (score.totalLoansCount == 0) {
            score.score = 575; // Starting score (middle of 300-850 range)
        }
        
        score.totalLoansCount++;
        score.lastUpdated = block.timestamp;
        
        if (_repaid) {
            score.repaidLoansCount++;
            // Increase score for successful repayment (clamped to max 850)
            score.score = score.score + 10 > 850 ? 850 : score.score + 10;
        } else {
            score.defaultedLoansCount++;
            // Decrease score for default (clamped to min 300)
            score.score = score.score > 50 ? (score.score - 50 < 300 ? 300 : score.score - 50) : 300;
        }
        
        emit CreditScoreUpdated(_borrower, score.score);
    }
    
    /**
     * @dev Get active loan requests for funding
     */
    function getActiveLoanRequests() external view returns (uint256[] memory) {
        uint256[] memory activeLoanIds = new uint256[](nextLoanId - 1);
        uint256 count = 0;
        
        for (uint256 i = 1; i < nextLoanId; i++) {
            if (loans[i].status == LoanStatus.REQUESTED) {
                activeLoanIds[count] = i;
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeLoanIds[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get loans eligible for liquidation
     */
    function getLoansEligibleForLiquidation() external view returns (uint256[] memory) {
        uint256[] memory eligibleLoanIds = new uint256[](nextLoanId - 1);
        uint256 count = 0;
        
        for (uint256 i = 1; i < nextLoanId; i++) {
            if (loans[i].status == LoanStatus.FUNDED) {
                (bool underwater, ) = isLoanUnderwater(i);
                if (underwater) {
                    eligibleLoanIds[count] = i;
                    count++;
                }
            }
        }
        
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = eligibleLoanIds[i];
        }
        
        return result;
    }
    
    /**
     * @dev Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Withdraw collected fees
     */
    function withdrawFees() external onlyOwner {
        uint256 amount = collectedFees;
        collectedFees = 0;
        
        (bool success, ) = payable(feeRecipient).call{value: amount}("");
        require(success, "Fee withdrawal failed");
    }
    
    /**
     * @dev Update liquidation parameters
     */
    function updateLiquidationParams(
        uint256 _liquidationFeeRate,
        uint256 _auctionDuration
    ) external onlyOwner {
        require(_liquidationFeeRate <= 1000, "Fee too high"); // Max 10%
        require(_auctionDuration >= 1 hours && _auctionDuration <= 7 days, "Invalid duration");
        
        liquidationFeeRate = _liquidationFeeRate;
        // Note: auction duration is constant, but could be made variable
    }
    
    /**
     * @dev Update dynamic rate parameters
     */
    function updateDynamicRateParams(
        uint256 _baseRate,
        uint256 _utilizationOptimal,
        uint256 _rateSlope1,
        uint256 _rateSlope2
    ) external onlyOwner {
        require(_utilizationOptimal <= 10000, "Invalid optimal utilization");
        require(_baseRate <= 2000, "Base rate too high"); // Max 20%
        
        baseInterestRate = _baseRate;
        utilizationOptimal = _utilizationOptimal;
        rateSlope1 = _rateSlope1;
        rateSlope2 = _rateSlope2;
    }
}