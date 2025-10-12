// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LoanVerse
 * @dev Next-generation DeFi lending platform with multi-token support and credit scoring
 */
contract LoanVerse is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;
    
    enum LoanStatus { 
        REQUESTED,    // Loan requested by borrower
        FUNDED,       // Loan funded by lender
        REPAID,       // Loan fully repaid
        DEFAULTED,    // Loan defaulted (collateral liquidated)
        CANCELLED,    // Loan cancelled by borrower
        LIQUIDATING   // Collateral being liquidated
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
    }
    
    // State variables
    uint256 public nextLoanId = 1;
    uint256 public nextTokenId = 1;
    uint256 public constant MIN_COLLATERAL_RATIO = 150; // 150%
    uint256 public constant MAX_INTEREST_RATE = 3000;   // 30% max
    uint256 public constant MIN_LOAN_DURATION = 1 days;
    uint256 public constant MAX_LOAN_DURATION = 365 days;
    uint256 public constant MIN_CREDIT_SCORE = 300; // Minimum credit score (300-850 range)
    
    // Protocol fees
    uint256 public protocolFeeRate = 50; // 0.5% in basis points
    address public feeRecipient;
    uint256 public collectedFees;
    
    // Mappings
    mapping(uint256 => Loan) public loans;
    mapping(uint256 => Token) public supportedTokens;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderLoans;
    mapping(address => CreditScore) public creditScores;
    mapping(address => bool) public authorizedRiskOracles;
    
    // Events
    event TokenAdded(uint256 indexed tokenId, address indexed contractAddress, string symbol);
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
    
    event CreditScoreUpdated(address indexed borrower, uint256 newScore);
    event RiskScoreUpdated(uint256 indexed loanId, uint256 riskScore);
    
    modifier onlyAuthorizedOracle() {
        require(authorizedRiskOracles[msg.sender], "Not authorized oracle");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        feeRecipient = msg.sender;
        
        // Add ETH as the first supported token
        supportedTokens[0] = Token({
            tokenType: TokenType.ETH,
            contractAddress: address(0),
            symbol: "ETH",
            decimals: 18,
            isActive: true
        });
    }
    
    /**
     * @dev Add a new supported ERC20 token
     */
    function addSupportedToken(
        address _contractAddress,
        string memory _symbol,
        uint8 _decimals
    ) external onlyOwner {
        require(_contractAddress != address(0), "Invalid contract address");
        
        supportedTokens[nextTokenId] = Token({
            tokenType: TokenType.ERC20,
            contractAddress: _contractAddress,
            symbol: _symbol,
            decimals: _decimals,
            isActive: true
        });
        
        emit TokenAdded(nextTokenId, _contractAddress, _symbol);
        nextTokenId++;
    }
    
    /**
     * @dev Deactivate a supported token
     */
    function deactivateToken(uint256 _tokenId) external onlyOwner {
        require(supportedTokens[_tokenId].isActive, "Token not active");
        supportedTokens[_tokenId].isActive = false;
        emit TokenDeactivated(_tokenId);
    }
    
    /**
     * @dev Set authorized risk oracle
     */
    function setAuthorizedOracle(address _oracle, bool _authorized) external onlyOwner {
        authorizedRiskOracles[_oracle] = _authorized;
    }
    
    /**
     * @dev Update risk score for a loan (called by authorized oracle)
     */
    function updateRiskScore(uint256 _loanId, uint256 _riskScore) external onlyAuthorizedOracle {
        require(_riskScore <= 1000, "Invalid risk score");
        require(loans[_loanId].borrower != address(0), "Loan does not exist");
        
        loans[_loanId].riskScore = _riskScore;
        emit RiskScoreUpdated(_loanId, _riskScore);
    }
    
    /**
     * @dev Request a loan with multi-token support
     */
    function requestLoan(
        uint256 _tokenId,
        uint256 _collateralTokenId,
        uint256 _amount,
        uint256 _interestRate,
        uint256 _duration,
        string memory _ipfsDocumentHash
    ) external payable nonReentrant whenNotPaused {
        require(_amount > 0, "Amount must be greater than 0");
        require(_interestRate <= MAX_INTEREST_RATE, "Interest rate too high");
        require(_duration >= MIN_LOAN_DURATION && _duration <= MAX_LOAN_DURATION, "Invalid duration");
        require(supportedTokens[_tokenId].isActive, "Token not supported");
        require(supportedTokens[_collateralTokenId].isActive, "Collateral token not supported");
        require(bytes(_ipfsDocumentHash).length > 0, "IPFS hash required");
        
        // Check minimum credit score
        require(creditScores[msg.sender].score >= MIN_CREDIT_SCORE || 
                creditScores[msg.sender].totalLoansCount == 0, "Credit score too low");
        
        uint256 requiredCollateral = (_amount * MIN_COLLATERAL_RATIO) / 100;
        
        if (supportedTokens[_collateralTokenId].tokenType == TokenType.ETH) {
            require(msg.value >= requiredCollateral, "Insufficient ETH collateral");
        } else {
            require(msg.value == 0, "ETH not needed for ERC20 collateral");
            IERC20 collateralToken = IERC20(supportedTokens[_collateralTokenId].contractAddress);
            require(collateralToken.balanceOf(msg.sender) >= requiredCollateral, "Insufficient ERC20 balance");
            collateralToken.safeTransferFrom(msg.sender, address(this), requiredCollateral);
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
            interestRate: _interestRate,
            duration: _duration,
            createdAt: block.timestamp,
            fundedAt: 0,
            dueDate: 0,
            status: LoanStatus.REQUESTED,
            ipfsDocumentHash: _ipfsDocumentHash,
            riskScore: 0,
            collateralClaimed: false
        });
        
        borrowerLoans[msg.sender].push(loanId);
        
        emit LoanRequested(
            loanId, 
            msg.sender, 
            _tokenId, 
            _amount, 
            loans[loanId].collateralAmount, 
            _interestRate, 
            _duration,
            _ipfsDocumentHash
        );
    }
    
    /**
     * @dev Fund a loan with multi-token support
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
    }
    
    /**
     * @dev Claim collateral after default
     */
    function claimCollateral(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.lender == msg.sender, "Only lender can claim");
        require(loan.status == LoanStatus.FUNDED, "Loan not active");
        require(block.timestamp > loan.dueDate, "Loan not expired");
        require(!loan.collateralClaimed, "Already claimed");
        
        loan.status = LoanStatus.DEFAULTED;
        loan.collateralClaimed = true;
        
        // Transfer collateral to lender
        if (supportedTokens[loan.collateralTokenId].tokenType == TokenType.ETH) {
            (bool success, ) = payable(loan.lender).call{value: loan.collateralAmount}("");
            require(success, "Collateral transfer failed");
        } else {
            IERC20 collateralToken = IERC20(supportedTokens[loan.collateralTokenId].contractAddress);
            collateralToken.safeTransfer(loan.lender, loan.collateralAmount);
        }
        
        // Update credit score for default
        _updateCreditScore(loan.borrower, false);
        
        emit LoanDefaulted(_loanId);
        emit CollateralClaimed(_loanId, loan.collateralAmount);
    }
    
    /**
     * @dev Cancel unfunded loan
     */
    function cancelLoan(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Only borrower can cancel");
        require(loan.status == LoanStatus.REQUESTED, "Can only cancel unfunded loans");
        
        loan.status = LoanStatus.CANCELLED;
        
        // Return collateral
        _returnCollateral(_loanId);
        
        emit LoanCancelled(_loanId);
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
}