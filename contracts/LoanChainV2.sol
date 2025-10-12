// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title LoanChainV2
 * @dev Enhanced decentralized P2P lending with multi-token support and advanced DeFi features
 */
contract LoanChainV2 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    enum LoanStatus { 
        REQUESTED,     // Loan requested by borrower
        FUNDED,        // Loan funded by lender
        PARTIALLY_FUNDED, // Partial funding enabled
        REPAID,        // Loan fully repaid
        DEFAULTED,     // Loan defaulted (collateral liquidated)
        CANCELLED      // Loan cancelled by borrower
    }

    enum TokenType {
        NATIVE_ETH,
        USDC,
        DAI,
        USDT,
        GOVERNANCE_TOKEN
    }
    
    struct Token {
        address contractAddress;
        TokenType tokenType;
        uint8 decimals;
        bool isActive;
        uint256 minLoanAmount;
        uint256 maxLoanAmount;
    }
    
    struct Loan {
        uint256 id;
        address borrower;
        address[] lenders;          // Support multiple lenders
        uint256[] lenderAmounts;    // Amount funded by each lender
        uint256 totalAmount;        // Total loan amount
        uint256 totalFunded;        // Amount funded so far
        TokenType loanToken;        // Token type for the loan
        TokenType collateralToken;  // Token type for collateral
        uint256 collateralAmount;   // Collateral amount
        uint256 interestRate;       // Base interest rate (basis points)
        bool isVariableRate;        // Variable rate loan
        uint256 duration;           // Loan duration in seconds
        uint256 createdAt;          // Creation timestamp
        uint256 fundedAt;           // Funding completion timestamp
        uint256 dueDate;            // Repayment due date
        LoanStatus status;
        bool collateralClaimed;
        uint256 riskScore;          // AI-calculated risk score
        bool hasInsurance;          // Lender insurance option
        uint256 insuranceFee;       // Insurance fee amount
    }

    struct LenderPosition {
        address lender;
        uint256 amount;
        uint256 fundedAt;
        bool repaid;
        uint256 repaidAmount;
    }
    
    // State variables
    uint256 public nextLoanId = 1;
    uint256 public constant MIN_COLLATERAL_RATIO = 120; // 120% for cross-collateral
    uint256 public constant MAX_INTEREST_RATE = 3000;   // 30% max interest
    uint256 public constant MIN_LOAN_DURATION = 1 hours; // Reduced for testing
    uint256 public constant MAX_LOAN_DURATION = 365 days;
    
    // Multi-token support
    mapping(TokenType => Token) public supportedTokens;
    mapping(uint256 => Loan) public loans;
    mapping(uint256 => mapping(address => LenderPosition)) public lenderPositions;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderLoans;
    
    // Multi-oracle price system for enhanced security
    struct PriceData {
        uint256 price;         // Price in USD with 8 decimals
        uint256 lastUpdate;    // Last update timestamp
        uint256 priceSource1;  // First price source
        uint256 priceSource2;  // Second price source  
        uint256 updateCount;   // Number of updates
    }
    
    mapping(TokenType => PriceData) public tokenPrices;
    mapping(address => bool) public priceOracles; // Approved price oracle addresses
    
    uint256 private constant PRICE_STALENESS_THRESHOLD = 3600; // 1 hour
    uint256 private constant MAX_PRICE_DEVIATION = 1000; // 10% in basis points
    
    // Insurance Pool Management
    mapping(TokenType => uint256) public insurancePools; // Insurance funds by token type
    mapping(uint256 => mapping(address => bool)) public hasClaimedInsurance; // Track claimed insurance by loan ID and lender
    mapping(address => uint256) public lenderInsuranceContributions; // Track lender contributions
    
    uint256 public constant INSURANCE_RATE = 100; // 1% insurance fee in basis points
    uint256 public constant CLAIM_GRACE_PERIOD = 7 days; // Grace period before claims allowed
    
    // Events
    event LoanRequested(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 totalAmount,
        TokenType loanToken,
        TokenType collateralToken,
        uint256 collateralAmount,
        uint256 interestRate,
        uint256 duration,
        bool isVariableRate
    );
    
    event LoanPartiallyFunded(
        uint256 indexed loanId,
        address indexed lender,
        uint256 amount,
        uint256 totalFunded
    );
    
    event LoanFullyFunded(
        uint256 indexed loanId,
        uint256 totalFunded,
        uint256 fundedAt
    );
    
    event LoanRepaid(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 totalRepaidAmount
    );
    
    event PartialRepayment(
        uint256 indexed loanId,
        address indexed lender,
        uint256 repaidAmount
    );
    
    event TokenAdded(TokenType indexed tokenType, address indexed contractAddress);
    event PriceUpdated(TokenType indexed tokenType, uint256 newPrice);
    event PriceOracleUpdated(address indexed oracle, bool approved);
    event InsuranceFeeCollected(uint256 indexed loanId, TokenType indexed token, uint256 amount);
    event InsuranceClaimed(uint256 indexed loanId, address indexed lender, uint256 amount);
    event InsurancePoolContribution(TokenType indexed token, uint256 amount);

    constructor() Ownable(msg.sender) {
        // Initialize supported tokens
        _initializeTokens();
    }

    /**
     * @dev Initialize supported tokens with mock addresses for development
     */
    function _initializeTokens() internal {
        // ETH (native)
        supportedTokens[TokenType.NATIVE_ETH] = Token({
            contractAddress: address(0),
            tokenType: TokenType.NATIVE_ETH,
            decimals: 18,
            isActive: true,
            minLoanAmount: 0.01 ether,
            maxLoanAmount: 1000 ether
        });
        
        // Initialize price data (8 decimals)
        tokenPrices[TokenType.NATIVE_ETH] = PriceData({
            price: 250000000000,
            lastUpdate: block.timestamp,
            priceSource1: 250000000000,
            priceSource2: 250000000000,
            updateCount: 1
        });
        tokenPrices[TokenType.USDC] = PriceData({
            price: 100000000,
            lastUpdate: block.timestamp,
            priceSource1: 100000000,
            priceSource2: 100000000,
            updateCount: 1
        });
        tokenPrices[TokenType.DAI] = PriceData({
            price: 100000000,
            lastUpdate: block.timestamp,
            priceSource1: 100000000,
            priceSource2: 100000000,
            updateCount: 1
        });
        tokenPrices[TokenType.USDT] = PriceData({
            price: 100000000,
            lastUpdate: block.timestamp,
            priceSource1: 100000000,
            priceSource2: 100000000,
            updateCount: 1
        });
        
        // Owner is initially approved as price oracle (can be removed later)
        priceOracles[msg.sender] = true;
    }

    /**
     * @dev Add or update supported token
     */
    function addSupportedToken(
        TokenType _tokenType,
        address _contractAddress,
        uint8 _decimals,
        uint256 _minLoanAmount,
        uint256 _maxLoanAmount
    ) external onlyOwner {
        supportedTokens[_tokenType] = Token({
            contractAddress: _contractAddress,
            tokenType: _tokenType,
            decimals: _decimals,
            isActive: true,
            minLoanAmount: _minLoanAmount,
            maxLoanAmount: _maxLoanAmount
        });
        
        emit TokenAdded(_tokenType, _contractAddress);
    }

    /**
     * @dev Add or remove price oracle (decentralized governance)
     */
    function setPriceOracle(address _oracle, bool _approved) external onlyOwner {
        priceOracles[_oracle] = _approved;
        emit PriceOracleUpdated(_oracle, _approved);
    }

    /**
     * @dev Update token price with validation (multi-oracle system)
     */
    function updateTokenPrice(TokenType _tokenType, uint256 _price1, uint256 _price2) external {
        require(priceOracles[msg.sender], "Not authorized price oracle");
        require(_price1 > 0 && _price2 > 0, "Invalid prices");
        
        PriceData storage priceData = tokenPrices[_tokenType];
        
        // Calculate average price from two sources
        uint256 avgPrice = (_price1 + _price2) / 2;
        
        // Validate price deviation (max 10% difference between sources)
        uint256 deviation = _price1 > _price2 
            ? ((_price1 - _price2) * 10000) / _price2
            : ((_price2 - _price1) * 10000) / _price1;
        require(deviation <= MAX_PRICE_DEVIATION, "Price sources deviate too much");
        
        // If not first price update, validate against existing price
        if (priceData.updateCount > 0) {
            uint256 priceDeviation = avgPrice > priceData.price
                ? ((avgPrice - priceData.price) * 10000) / priceData.price
                : ((priceData.price - avgPrice) * 10000) / avgPrice;
            require(priceDeviation <= MAX_PRICE_DEVIATION * 3, "New price deviates too much from current");
        }
        
        // Update price data
        priceData.price = avgPrice;
        priceData.lastUpdate = block.timestamp;
        priceData.priceSource1 = _price1;
        priceData.priceSource2 = _price2;
        priceData.updateCount++;
        
        emit PriceUpdated(_tokenType, avgPrice);
    }

    /**
     * @dev Calculate USD value of token amount
     */
    function calculateUSDValue(TokenType _tokenType, uint256 _amount) public view returns (uint256) {
        Token memory token = supportedTokens[_tokenType];
        PriceData memory priceData = tokenPrices[_tokenType];
        
        // Check if price is not stale
        require(
            block.timestamp - priceData.lastUpdate <= PRICE_STALENESS_THRESHOLD,
            "Price data is stale"
        );
        
        // Convert amount to USD value (8 decimals)
        return (_amount * priceData.price) / (10 ** token.decimals);
    }

    /**
     * @dev Check if collateral is sufficient for cross-collateral loans
     */
    function _isCollateralSufficient(
        TokenType _loanToken,
        uint256 _loanAmount,
        TokenType _collateralToken,
        uint256 _collateralAmount
    ) internal view returns (bool) {
        uint256 loanValueUSD = calculateUSDValue(_loanToken, _loanAmount);
        uint256 collateralValueUSD = calculateUSDValue(_collateralToken, _collateralAmount);
        
        // Require 120% collateralization
        uint256 requiredCollateralUSD = (loanValueUSD * MIN_COLLATERAL_RATIO) / 100;
        
        return collateralValueUSD >= requiredCollateralUSD;
    }

    /**
     * @dev Request a new loan with specified tokens
     */
    function requestLoan(
        uint256 _totalAmount,
        TokenType _loanToken,
        TokenType _collateralToken,
        uint256 _collateralAmount,
        uint256 _interestRate,
        uint256 _duration,
        bool _isVariableRate,
        bool _hasInsurance
    ) external payable nonReentrant {
        require(_totalAmount > 0, "Loan amount must be greater than 0");
        require(_interestRate <= MAX_INTEREST_RATE, "Interest rate too high");
        require(_duration >= MIN_LOAN_DURATION && _duration <= MAX_LOAN_DURATION, "Invalid duration");
        require(supportedTokens[_loanToken].isActive, "Loan token not supported");
        require(supportedTokens[_collateralToken].isActive, "Collateral token not supported");
        
        // Check collateral sufficiency for cross-collateral
        require(
            _isCollateralSufficient(_loanToken, _totalAmount, _collateralToken, _collateralAmount),
            "Insufficient collateral"
        );

        uint256 loanId = nextLoanId++;
        
        // Calculate insurance fee first
        uint256 insuranceFee = 0;
        if (_hasInsurance) {
            insuranceFee = (_totalAmount * INSURANCE_RATE) / 10000; // 1% insurance fee
        }

        // Handle collateral and insurance fee collection
        if (_collateralToken == TokenType.NATIVE_ETH) {
            uint256 requiredETH = _collateralAmount;
            if (_hasInsurance && _loanToken == TokenType.NATIVE_ETH) {
                requiredETH += insuranceFee;
            }
            require(msg.value == requiredETH, "ETH sent must match collateral plus insurance fee (if applicable)");
        } else {
            // ERC20 collateral case
            if (_hasInsurance && _loanToken == TokenType.NATIVE_ETH) {
                require(msg.value == insuranceFee, "Must send exact ETH insurance fee");
            } else {
                require(msg.value == 0, "No ETH should be sent");
            }
            // Transfer ERC20 collateral tokens
            Token memory collateralToken = supportedTokens[_collateralToken];
            IERC20(collateralToken.contractAddress).safeTransferFrom(
                msg.sender,
                address(this),
                _collateralAmount
            );
        }

        // Collect insurance fee if applicable
        if (_hasInsurance) {
            if (_loanToken != TokenType.NATIVE_ETH) {
                // For ERC20 loan tokens, collect insurance fee separately
                Token memory loanTokenInfo = supportedTokens[_loanToken];
                IERC20(loanTokenInfo.contractAddress).safeTransferFrom(
                    msg.sender,
                    address(this),
                    insuranceFee
                );
            }
            // ETH insurance fee already collected above with collateral/msg.value
            
            // Add to insurance pool
            insurancePools[_loanToken] += insuranceFee;
            emit InsuranceFeeCollected(loanId, _loanToken, insuranceFee);
        }
        
        loans[loanId] = Loan({
            id: loanId,
            borrower: msg.sender,
            lenders: new address[](0),
            lenderAmounts: new uint256[](0),
            totalAmount: _totalAmount,
            totalFunded: 0,
            loanToken: _loanToken,
            collateralToken: _collateralToken,
            collateralAmount: _collateralAmount,
            interestRate: _interestRate,
            isVariableRate: _isVariableRate,
            duration: _duration,
            createdAt: block.timestamp,
            fundedAt: 0,
            dueDate: 0,
            status: LoanStatus.REQUESTED,
            collateralClaimed: false,
            riskScore: 500, // Default risk score, can be updated by oracle
            hasInsurance: _hasInsurance,
            insuranceFee: insuranceFee
        });
        
        borrowerLoans[msg.sender].push(loanId);
        
        emit LoanRequested(
            loanId,
            msg.sender,
            _totalAmount,
            _loanToken,
            _collateralToken,
            _collateralAmount,
            _interestRate,
            _duration,
            _isVariableRate
        );
    }

    /**
     * @dev Fund a loan (supports partial funding)
     */
    function fundLoan(uint256 _loanId, uint256 _amount) external payable nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.borrower != address(0), "Loan does not exist");
        require(loan.status == LoanStatus.REQUESTED || loan.status == LoanStatus.PARTIALLY_FUNDED, "Loan not available");
        require(msg.sender != loan.borrower, "Cannot fund your own loan");
        require(_amount > 0, "Funding amount must be greater than 0");
        require(loan.totalFunded + _amount <= loan.totalAmount, "Exceeds loan amount");

        // Handle loan token transfer
        if (loan.loanToken == TokenType.NATIVE_ETH) {
            require(msg.value == _amount, "Incorrect ETH amount sent");
        } else {
            Token memory loanToken = supportedTokens[loan.loanToken];
            IERC20(loanToken.contractAddress).safeTransferFrom(
                msg.sender,
                address(this),
                _amount
            );
        }

        // Record lender position
        lenderPositions[_loanId][msg.sender] = LenderPosition({
            lender: msg.sender,
            amount: _amount,
            fundedAt: block.timestamp,
            repaid: false,
            repaidAmount: 0
        });

        // Update loan funding
        loan.lenders.push(msg.sender);
        loan.lenderAmounts.push(_amount);
        loan.totalFunded += _amount;
        lenderLoans[msg.sender].push(_loanId);

        if (loan.totalFunded >= loan.totalAmount) {
            // Loan fully funded
            loan.status = LoanStatus.FUNDED;
            loan.fundedAt = block.timestamp;
            loan.dueDate = block.timestamp + loan.duration;

            // Transfer full loan amount to borrower
            _transferTokens(loan.loanToken, loan.borrower, loan.totalAmount);

            emit LoanFullyFunded(_loanId, loan.totalFunded, block.timestamp);
        } else {
            // Partial funding
            loan.status = LoanStatus.PARTIALLY_FUNDED;
            emit LoanPartiallyFunded(_loanId, msg.sender, _amount, loan.totalFunded);
        }
    }

    /**
     * @dev Repay a loan with interest (supports multi-lender repayment)
     */
    function repayLoan(uint256 _loanId) external payable nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Only borrower can repay");
        require(loan.status == LoanStatus.FUNDED, "Loan not active");
        require(block.timestamp <= loan.dueDate, "Loan expired");
        
        // Calculate total repayment amount with interest
        uint256 interest = (loan.totalAmount * loan.interestRate) / 10000;
        uint256 totalRepayment = loan.totalAmount + interest;
        
        // Handle repayment based on loan token type
        if (loan.loanToken == TokenType.NATIVE_ETH) {
            require(msg.value >= totalRepayment, "Insufficient repayment amount");
            
            // Distribute repayment to all lenders proportionally
            for (uint256 i = 0; i < loan.lenders.length; i++) {
                address lender = loan.lenders[i];
                uint256 lenderShare = loan.lenderAmounts[i];
                uint256 lenderInterest = (lenderShare * loan.interestRate) / 10000;
                uint256 lenderRepayment = lenderShare + lenderInterest;
                
                (bool success, ) = payable(lender).call{value: lenderRepayment}("");
                require(success, "Transfer to lender failed");
                
                // Update lender position
                lenderPositions[_loanId][lender].repaid = true;
                lenderPositions[_loanId][lender].repaidAmount = lenderRepayment;
            }
            
            // Return excess ETH to borrower
            if (msg.value > totalRepayment) {
                (bool success, ) = payable(msg.sender).call{value: msg.value - totalRepayment}("");
                require(success, "Excess return failed");
            }
        } else {
            require(msg.value == 0, "ETH not needed for ERC20 repayment");
            Token memory loanToken = supportedTokens[loan.loanToken];
            IERC20 tokenContract = IERC20(loanToken.contractAddress);
            
            // Distribute repayment to all lenders proportionally
            for (uint256 i = 0; i < loan.lenders.length; i++) {
                address lender = loan.lenders[i];
                uint256 lenderShare = loan.lenderAmounts[i];
                uint256 lenderInterest = (lenderShare * loan.interestRate) / 10000;
                uint256 lenderRepayment = lenderShare + lenderInterest;
                
                tokenContract.safeTransferFrom(msg.sender, lender, lenderRepayment);
                
                // Update lender position
                lenderPositions[_loanId][lender].repaid = true;
                lenderPositions[_loanId][lender].repaidAmount = lenderRepayment;
            }
        }
        
        // Update loan status
        loan.status = LoanStatus.REPAID;
        
        // Return collateral to borrower
        _returnCollateral(_loanId);
        
        emit LoanRepaid(_loanId, msg.sender, totalRepayment);
    }

    /**
     * @dev Return collateral to borrower
     */
    function _returnCollateral(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        require(!loan.collateralClaimed, "Collateral already claimed");
        
        if (loan.collateralAmount > 0) {
            _transferTokens(loan.collateralToken, loan.borrower, loan.collateralAmount);
            loan.collateralClaimed = true;
        }
    }

    /**
     * @dev Internal function to transfer tokens
     */
    function _transferTokens(TokenType _tokenType, address _to, uint256 _amount) internal {
        if (_tokenType == TokenType.NATIVE_ETH) {
            (bool success, ) = payable(_to).call{value: _amount}("");
            require(success, "ETH transfer failed");
        } else {
            Token memory token = supportedTokens[_tokenType];
            IERC20(token.contractAddress).safeTransfer(_to, _amount);
        }
    }

    /**
     * @dev Get loan details
     */
    function getLoan(uint256 _loanId) external view returns (Loan memory) {
        return loans[_loanId];
    }

    /**
     * @dev Get active loan requests for browsing
     */
    function getActiveLoanRequests() external view returns (uint256[] memory) {
        uint256[] memory activeLoanIds = new uint256[](nextLoanId - 1);
        uint256 count = 0;
        
        for (uint256 i = 1; i < nextLoanId; i++) {
            if (loans[i].status == LoanStatus.REQUESTED || loans[i].status == LoanStatus.PARTIALLY_FUNDED) {
                activeLoanIds[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeLoanIds[i];
        }
        
        return result;
    }

    /**
     * @dev Get supported token details
     */
    function getSupportedToken(TokenType _tokenType) external view returns (Token memory) {
        return supportedTokens[_tokenType];
    }

    /**
     * @dev Get current token price with staleness check
     */
    function getTokenPrice(TokenType _tokenType) external view returns (uint256) {
        PriceData memory priceData = tokenPrices[_tokenType];
        require(
            block.timestamp - priceData.lastUpdate <= PRICE_STALENESS_THRESHOLD,
            "Price data is stale"
        );
        return priceData.price;
    }
    
    /**
     * @dev Get detailed price information
     */
    function getTokenPriceInfo(TokenType _tokenType) external view returns (
        uint256 price,
        uint256 lastUpdate,
        uint256 source1,
        uint256 source2,
        uint256 updateCount,
        bool isStale
    ) {
        PriceData memory priceData = tokenPrices[_tokenType];
        return (
            priceData.price,
            priceData.lastUpdate,
            priceData.priceSource1,
            priceData.priceSource2,
            priceData.updateCount,
            block.timestamp - priceData.lastUpdate > PRICE_STALENESS_THRESHOLD
        );
    }
    
    /**
     * @dev Claim insurance for defaulted loan (lenders only)
     */
    function claimInsurance(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.id != 0, "Loan does not exist");
        require(loan.status == LoanStatus.DEFAULTED, "Loan is not defaulted");
        require(loan.hasInsurance, "Loan does not have insurance");
        require(!hasClaimedInsurance[_loanId][msg.sender], "Insurance already claimed by this lender");
        require(
            block.timestamp >= loan.dueDate + CLAIM_GRACE_PERIOD,
            "Grace period not ended"
        );
        
        // Calculate total amount contributed by this lender (may have funded multiple times)
        bool isLender = false;
        uint256 lenderAmount = 0;
        for (uint256 i = 0; i < loan.lenders.length; i++) {
            if (loan.lenders[i] == msg.sender) {
                isLender = true;
                lenderAmount += loan.lenderAmounts[i];
            }
        }
        require(isLender, "Not a lender on this loan");
        require(lenderAmount > 0, "No amount to claim");
        
        // Calculate insurance payout (proportional to lender's contribution)
        uint256 totalInsuranceFund = insurancePools[loan.loanToken];
        
        // Ensure sufficient insurance funds
        require(totalInsuranceFund > 0, "No insurance funds available");
        
        // Calculate proportional insurance payout
        uint256 insurancePayout = (lenderAmount * loan.insuranceFee) / loan.totalAmount;
        require(insurancePayout <= totalInsuranceFund, "Insufficient insurance funds");
        
        // Mark insurance as claimed for this lender
        hasClaimedInsurance[_loanId][msg.sender] = true;
        
        // Reduce insurance pool
        insurancePools[loan.loanToken] -= insurancePayout;
        
        // Transfer insurance payout to lender
        if (loan.loanToken == TokenType.NATIVE_ETH) {
            (bool success, ) = msg.sender.call{value: insurancePayout}("");
            require(success, "ETH transfer failed");
        } else {
            Token memory loanTokenInfo = supportedTokens[loan.loanToken];
            IERC20(loanTokenInfo.contractAddress).safeTransfer(msg.sender, insurancePayout);
        }
        
        emit InsuranceClaimed(_loanId, msg.sender, insurancePayout);
    }
    
    /**
     * @dev Add funds to insurance pool (anyone can contribute)
     */
    function contributeToInsurancePool(TokenType _tokenType, uint256 _amount) external payable nonReentrant {
        require(_amount > 0, "Amount must be positive");
        
        if (_tokenType == TokenType.NATIVE_ETH) {
            require(msg.value == _amount, "ETH amount mismatch");
        } else {
            require(msg.value == 0, "No ETH should be sent");
            Token memory tokenInfo = supportedTokens[_tokenType];
            IERC20(tokenInfo.contractAddress).safeTransferFrom(msg.sender, address(this), _amount);
        }
        
        insurancePools[_tokenType] += _amount;
        lenderInsuranceContributions[msg.sender] += _amount;
        
        emit InsurancePoolContribution(_tokenType, _amount);
    }
    
    /**
     * @dev Get insurance pool balance for a token
     */
    function getInsurancePoolBalance(TokenType _tokenType) external view returns (uint256) {
        return insurancePools[_tokenType];
    }
    
    /**
     * @dev Get insurance status for a loan
     */
    function getInsuranceStatus(uint256 _loanId, address _lender) external view returns (
        bool hasInsurance,
        uint256 insuranceFee,
        bool isClaimed,
        bool canClaim
    ) {
        Loan storage loan = loans[_loanId];
        require(loan.id != 0, "Loan does not exist");
        
        hasInsurance = loan.hasInsurance;
        insuranceFee = loan.insuranceFee;
        isClaimed = hasClaimedInsurance[_loanId][_lender];
        
        // Check if the address is a lender and calculate total contribution
        bool isLender = false;
        uint256 totalContribution = 0;
        for (uint256 i = 0; i < loan.lenders.length; i++) {
            if (loan.lenders[i] == _lender) {
                isLender = true;
                totalContribution += loan.lenderAmounts[i];
            }
        }
        
        canClaim = loan.hasInsurance &&
                  loan.status == LoanStatus.DEFAULTED &&
                  !hasClaimedInsurance[_loanId][_lender] &&
                  isLender &&
                  totalContribution > 0 &&
                  block.timestamp >= loan.dueDate + CLAIM_GRACE_PERIOD;
        
        return (hasInsurance, insuranceFee, isClaimed, canClaim);
    }

    /**
     * @dev Get all loan IDs for a borrower
     */
    function getBorrowerLoans(address _borrower) external view returns (uint256[] memory) {
        return borrowerLoans[_borrower];
    }

    /**
     * @dev Get all loan IDs for a lender  
     */
    function getLenderLoans(address _lender) external view returns (uint256[] memory) {
        return lenderLoans[_lender];
    }
}