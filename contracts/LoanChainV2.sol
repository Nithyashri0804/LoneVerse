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
    
    // Price oracle (simplified for now, can be enhanced with Chainlink)
    mapping(TokenType => uint256) public tokenPrices; // Price in USD with 8 decimals
    
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
        
        // Mock token prices (USD with 8 decimals)
        tokenPrices[TokenType.NATIVE_ETH] = 250000000000; // $2500 ETH
        tokenPrices[TokenType.USDC] = 100000000;          // $1 USDC
        tokenPrices[TokenType.DAI] = 100000000;           // $1 DAI  
        tokenPrices[TokenType.USDT] = 100000000;          // $1 USDT
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
     * @dev Update token price (simplified oracle)
     */
    function updateTokenPrice(TokenType _tokenType, uint256 _price) external onlyOwner {
        tokenPrices[_tokenType] = _price;
        emit PriceUpdated(_tokenType, _price);
    }

    /**
     * @dev Calculate USD value of token amount
     */
    function calculateUSDValue(TokenType _tokenType, uint256 _amount) public view returns (uint256) {
        Token memory token = supportedTokens[_tokenType];
        uint256 price = tokenPrices[_tokenType];
        
        // Convert amount to USD value (8 decimals)
        return (_amount * price) / (10 ** token.decimals);
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
        
        // Handle collateral deposit
        if (_collateralToken == TokenType.NATIVE_ETH) {
            require(msg.value == _collateralAmount, "ETH sent must exactly match collateral amount");
        } else {
            require(msg.value == 0, "No ETH should be sent for ERC20 collateral");
            // Transfer ERC20 collateral tokens
            Token memory collateralToken = supportedTokens[_collateralToken];
            IERC20(collateralToken.contractAddress).safeTransferFrom(
                msg.sender,
                address(this),
                _collateralAmount
            );
        }

        // Calculate insurance fee if requested
        uint256 insuranceFee = 0;
        if (_hasInsurance) {
            insuranceFee = (_totalAmount * 100) / 10000; // 1% insurance fee
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
     * @dev Get current token price
     */
    function getTokenPrice(TokenType _tokenType) external view returns (uint256) {
        return tokenPrices[_tokenType];
    }
}