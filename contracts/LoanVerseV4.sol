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
 * @title LoanVerseV4
 * @dev Multi-lender pooled lending platform with voting mechanism for defaults
 */
contract LoanVerseV4 is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;
    
    enum LoanStatus { 
        REQUESTED,      // Loan requested by borrower, accepting contributions
        FUNDING_FAILED, // Funding deadline passed without full funding
        FUNDED,         // Loan fully funded by lenders
        REPAID,         // Loan fully repaid
        DEFAULTED,      // Loan defaulted (collateral handled per vote)
        CANCELLED,      // Loan cancelled by borrower
        VOTING          // Lenders voting on default handling
    }
    
    enum TokenType {
        ETH,
        ERC20
    }
    
    enum DefaultAction {
        LIQUIDATE,      // Liquidate and split proceeds
        CLAIM_PROPORTIONAL  // Each lender claims proportional collateral
    }
    
    struct Token {
        TokenType tokenType;
        address contractAddress;  // 0x0 for ETH
        string symbol;
        uint8 decimals;
        bool isActive;
        AggregatorV3Interface priceFeed; // Chainlink price feed
    }
    
    struct LenderContribution {
        address lender;
        uint256 amount;
        bool repaid;
    }
    
    struct DefaultVote {
        DefaultAction action;
        uint256 votes;  // Sum of voting power (contribution amounts)
    }
    
    struct CreditScore {
        uint256 score;           // 300-850 credit score
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
        uint256 tokenId;          // ID of the token being borrowed
        uint256 collateralTokenId; // ID of the collateral token
        uint256 amount;           // Total loan amount requested
        uint256 amountFunded;     // Amount funded so far
        uint256 collateralAmount; // Collateral amount
        uint256 interestRate;     // Interest rate (basis points)
        uint256 duration;         // Loan duration in seconds
        uint256 minContribution;  // Minimum contribution per lender
        uint256 fundingDeadline;  // Timestamp when funding period ends
        uint256 createdAt;
        uint256 fundedAt;
        uint256 dueDate;
        LoanStatus status;
        string ipfsDocumentHash;  // IPFS hash for loan documents
        uint256 riskScore;        // AI-calculated risk score (0-1000)
        uint256 liquidationThreshold; // Liquidation threshold percentage
        uint256 totalRepaid;      // Total amount repaid so far
        uint256 earlyRepaymentPenalty; // Penalty in basis points for early repayment
    }
    
    // State variables
    uint256 public nextLoanId = 1;
    uint256 public nextTokenId = 1;
    uint256 public constant MIN_COLLATERAL_RATIO = 150; // 150%
    uint256 public constant LIQUIDATION_THRESHOLD = 120; // 120%
    uint256 public constant MAX_INTEREST_RATE = 3000;   // 30% max
    uint256 public constant MIN_LOAN_DURATION = 1 days;
    uint256 public constant MAX_LOAN_DURATION = 365 days;
    uint256 public constant MIN_CREDIT_SCORE = 300;
    uint256 public constant DEFAULT_FUNDING_PERIOD = 7 days;
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant PRICE_STALENESS_THRESHOLD = 3600; // 1 hour
    
    // Protocol fees
    uint256 public protocolFeeRate = 50; // 0.5% in basis points
    address public feeRecipient;
    uint256 public collectedFees;
    
    // Mappings
    mapping(uint256 => Loan) public loans;
    mapping(uint256 => Token) public supportedTokens;
    mapping(uint256 => LenderContribution[]) public loanContributions;
    mapping(uint256 => mapping(address => uint256)) public lenderContributionIndex;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderLoans;
    mapping(address => CreditScore) public creditScores;
    mapping(address => bool) public authorizedRiskOracles;
    
    // Default voting
    mapping(uint256 => mapping(DefaultAction => uint256)) public defaultVotes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => uint256) public votingDeadline;
    
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
        uint256 minContribution,
        uint256 fundingDeadline,
        string ipfsHash
    );
    
    event LoanContribution(uint256 indexed loanId, address indexed lender, uint256 amount, uint256 totalFunded);
    event LoanFullyFunded(uint256 indexed loanId, uint256 totalAmount, uint256 lenderCount);
    event LoanFundingFailed(uint256 indexed loanId, uint256 amountFunded, uint256 amountRequired);
    event LoanRepayment(uint256 indexed loanId, uint256 repaidAmount, uint256 totalRepaid);
    event LenderPayout(uint256 indexed loanId, address indexed lender, uint256 amount);
    event LoanFullyRepaid(uint256 indexed loanId);
    event LoanDefaulted(uint256 indexed loanId);
    event LoanCancelled(uint256 indexed loanId);
    event RefundIssued(uint256 indexed loanId, address indexed lender, uint256 amount);
    
    event DefaultVotingStarted(uint256 indexed loanId, uint256 votingDeadline);
    event VoteCast(uint256 indexed loanId, address indexed lender, DefaultAction action, uint256 votingPower);
    event DefaultActionExecuted(uint256 indexed loanId, DefaultAction action);
    
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
            isActive: true,
            priceFeed: AggregatorV3Interface(address(0))
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
     * @dev Get latest price from Chainlink oracle
     */
    function getLatestPrice(uint256 _tokenId) public view returns (uint256, uint256) {
        Token memory token = supportedTokens[_tokenId];
        require(token.isActive, "Token not supported");
        
        if (address(token.priceFeed) == address(0)) {
            // For tokens without price feed, return mock price
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
     * @dev Request a pooled loan with multi-lender support
     */
    function requestLoan(
        uint256 _tokenId,
        uint256 _collateralTokenId,
        uint256 _amount,
        uint256 _interestRate,
        uint256 _duration,
        uint256 _minContribution,
        uint256 _fundingPeriod,
        uint256 _earlyRepaymentPenalty,
        string memory _ipfsDocumentHash
    ) external payable nonReentrant whenNotPaused {
        require(_amount > 0, "Amount must be greater than 0");
        require(_interestRate <= MAX_INTEREST_RATE, "Interest rate too high");
        require(_duration >= MIN_LOAN_DURATION && _duration <= MAX_LOAN_DURATION, "Invalid duration");
        require(supportedTokens[_tokenId].isActive, "Token not supported");
        require(supportedTokens[_collateralTokenId].isActive, "Collateral token not supported");
        require(bytes(_ipfsDocumentHash).length > 0, "IPFS hash required");
        require(_minContribution > 0 && _minContribution <= _amount / 2, "Invalid min contribution");
        require(_fundingPeriod >= 1 days && _fundingPeriod <= 30 days, "Invalid funding period");
        require(_earlyRepaymentPenalty <= 500, "Penalty too high"); // Max 5%
        
        // Check minimum credit score
        require(creditScores[msg.sender].score >= MIN_CREDIT_SCORE || 
                creditScores[msg.sender].totalLoansCount == 0, "Credit score too low");
        
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
        uint256 fundingDeadline = block.timestamp + _fundingPeriod;
        
        loans[loanId] = Loan({
            id: loanId,
            borrower: msg.sender,
            tokenId: _tokenId,
            collateralTokenId: _collateralTokenId,
            amount: _amount,
            amountFunded: 0,
            collateralAmount: supportedTokens[_collateralTokenId].tokenType == TokenType.ETH ? 
                              msg.value : requiredCollateral,
            interestRate: _interestRate,
            duration: _duration,
            minContribution: _minContribution,
            fundingDeadline: fundingDeadline,
            createdAt: block.timestamp,
            fundedAt: 0,
            dueDate: 0,
            status: LoanStatus.REQUESTED,
            ipfsDocumentHash: _ipfsDocumentHash,
            riskScore: 0,
            liquidationThreshold: LIQUIDATION_THRESHOLD,
            totalRepaid: 0,
            earlyRepaymentPenalty: _earlyRepaymentPenalty
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
            _minContribution,
            fundingDeadline,
            _ipfsDocumentHash
        );
    }
    
    /**
     * @dev Contribute to a pooled loan
     */
    function contributeLoan(uint256 _loanId, uint256 _amount) external payable nonReentrant whenNotPaused {
        Loan storage loan = loans[_loanId];
        require(loan.borrower != address(0), "Loan does not exist");
        require(loan.status == LoanStatus.REQUESTED, "Loan not available");
        require(block.timestamp <= loan.fundingDeadline, "Funding deadline passed");
        require(msg.sender != loan.borrower, "Cannot fund own loan");
        require(_amount >= loan.minContribution, "Below minimum contribution");
        
        uint256 remainingAmount = loan.amount - loan.amountFunded;
        require(_amount <= remainingAmount, "Exceeds remaining amount");
        
        // Ensure minimum contribution threshold is maintained for remaining amount
        if (remainingAmount - _amount > 0 && remainingAmount - _amount < loan.minContribution) {
            revert("Would leave amount below minimum for others");
        }
        
        // Transfer funds from lender
        if (supportedTokens[loan.tokenId].tokenType == TokenType.ETH) {
            require(msg.value == _amount, "Incorrect ETH amount");
        } else {
            require(msg.value == 0, "ETH not needed for ERC20 loan");
            IERC20 token = IERC20(supportedTokens[loan.tokenId].contractAddress);
            token.safeTransferFrom(msg.sender, address(this), _amount);
        }
        
        // Record contribution
        loanContributions[_loanId].push(LenderContribution({
            lender: msg.sender,
            amount: _amount,
            repaid: false
        }));
        
        lenderContributionIndex[_loanId][msg.sender] = loanContributions[_loanId].length - 1;
        lenderLoans[msg.sender].push(_loanId);
        
        loan.amountFunded += _amount;
        
        emit LoanContribution(_loanId, msg.sender, _amount, loan.amountFunded);
        
        // Check if loan is fully funded
        if (loan.amountFunded == loan.amount) {
            _fullyFundLoan(_loanId);
        }
    }
    
    /**
     * @dev Internal function to mark loan as fully funded and transfer to borrower
     */
    function _fullyFundLoan(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        loan.status = LoanStatus.FUNDED;
        loan.fundedAt = block.timestamp;
        loan.dueDate = block.timestamp + loan.duration;
        
        // Transfer funds to borrower
        if (supportedTokens[loan.tokenId].tokenType == TokenType.ETH) {
            (bool success, ) = payable(loan.borrower).call{value: loan.amount}("");
            require(success, "Transfer to borrower failed");
        } else {
            IERC20 token = IERC20(supportedTokens[loan.tokenId].contractAddress);
            token.safeTransfer(loan.borrower, loan.amount);
        }
        
        emit LoanFullyFunded(_loanId, loan.amount, loanContributions[_loanId].length);
    }
    
    /**
     * @dev Process funding failure and refund all lenders
     */
    function processFundingFailure(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.REQUESTED, "Not in funding state");
        require(block.timestamp > loan.fundingDeadline, "Funding period not ended");
        require(loan.amountFunded < loan.amount, "Loan fully funded");
        
        loan.status = LoanStatus.FUNDING_FAILED;
        
        // Refund all lenders
        LenderContribution[] memory contributions = loanContributions[_loanId];
        for (uint256 i = 0; i < contributions.length; i++) {
            _refundLender(_loanId, contributions[i].lender, contributions[i].amount);
        }
        
        // Return collateral to borrower
        _returnCollateral(_loanId);
        
        emit LoanFundingFailed(_loanId, loan.amountFunded, loan.amount);
    }
    
    /**
     * @dev Repay loan (can be partial or full)
     */
    function repayLoan(uint256 _loanId) external payable nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Only borrower can repay");
        require(loan.status == LoanStatus.FUNDED, "Loan not active");
        
        bool isEarly = block.timestamp < loan.dueDate;
        require(isEarly || block.timestamp <= loan.dueDate + 30 days, "Too late to repay");
        
        uint256 interest = (loan.amount * loan.interestRate) / 10000;
        uint256 totalOwed = loan.amount + interest;
        
        // Apply early repayment penalty if applicable
        if (isEarly && loan.earlyRepaymentPenalty > 0) {
            uint256 penalty = (loan.amount * loan.earlyRepaymentPenalty) / 10000;
            totalOwed += penalty;
        }
        
        uint256 remainingOwed = totalOwed - loan.totalRepaid;
        uint256 repaymentAmount;
        
        if (supportedTokens[loan.tokenId].tokenType == TokenType.ETH) {
            repaymentAmount = msg.value;
        } else {
            repaymentAmount = remainingOwed; // For ERC20, we'll transfer the exact remaining amount
        }
        
        require(repaymentAmount > 0 && repaymentAmount <= remainingOwed, "Invalid repayment amount");
        
        // Transfer repayment
        if (supportedTokens[loan.tokenId].tokenType == TokenType.ERC20) {
            IERC20 token = IERC20(supportedTokens[loan.tokenId].contractAddress);
            token.safeTransferFrom(msg.sender, address(this), repaymentAmount);
        }
        
        loan.totalRepaid += repaymentAmount;
        
        // Distribute proportionally to lenders
        _distributeRepayment(_loanId, repaymentAmount);
        
        emit LoanRepayment(_loanId, repaymentAmount, loan.totalRepaid);
        
        // Check if fully repaid
        if (loan.totalRepaid >= totalOwed) {
            loan.status = LoanStatus.REPAID;
            
            // Return excess if any
            if (supportedTokens[loan.tokenId].tokenType == TokenType.ETH && msg.value > remainingOwed) {
                (bool success, ) = payable(msg.sender).call{value: msg.value - remainingOwed}("");
                require(success, "Excess return failed");
            }
            
            // Return collateral
            _returnCollateral(_loanId);
            
            // Update credit score
            _updateCreditScore(loan.borrower, true);
            
            emit LoanFullyRepaid(_loanId);
        }
    }
    
    /**
     * @dev Distribute repayment proportionally to all lenders
     */
    function _distributeRepayment(uint256 _loanId, uint256 _repaymentAmount) internal {
        Loan storage loan = loans[_loanId];
        LenderContribution[] storage contributions = loanContributions[_loanId];
        
        uint256 protocolFee = (_repaymentAmount * protocolFeeRate) / 10000;
        uint256 distributionAmount = _repaymentAmount - protocolFee;
        collectedFees += protocolFee;
        
        for (uint256 i = 0; i < contributions.length; i++) {
            uint256 lenderShare = (distributionAmount * contributions[i].amount) / loan.amount;
            
            if (lenderShare > 0) {
                if (supportedTokens[loan.tokenId].tokenType == TokenType.ETH) {
                    (bool success, ) = payable(contributions[i].lender).call{value: lenderShare}("");
                    require(success, "Lender payout failed");
                } else {
                    IERC20 token = IERC20(supportedTokens[loan.tokenId].contractAddress);
                    token.safeTransfer(contributions[i].lender, lenderShare);
                }
                
                emit LenderPayout(_loanId, contributions[i].lender, lenderShare);
            }
        }
    }
    
    /**
     * @dev Trigger default and start voting process
     */
    function triggerDefault(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.FUNDED, "Loan not active");
        require(block.timestamp > loan.dueDate + 30 days, "Grace period not ended");
        
        loan.status = LoanStatus.VOTING;
        votingDeadline[_loanId] = block.timestamp + VOTING_PERIOD;
        
        // Update credit score for default
        _updateCreditScore(loan.borrower, false);
        
        emit DefaultVotingStarted(_loanId, votingDeadline[_loanId]);
        emit LoanDefaulted(_loanId);
    }
    
    /**
     * @dev Vote on default action (lenders only)
     */
    function voteOnDefault(uint256 _loanId, DefaultAction _action) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.VOTING, "Not in voting state");
        require(block.timestamp <= votingDeadline[_loanId], "Voting period ended");
        require(!hasVoted[_loanId][msg.sender], "Already voted");
        
        // Find lender's contribution
        uint256 votingPower = 0;
        LenderContribution[] memory contributions = loanContributions[_loanId];
        for (uint256 i = 0; i < contributions.length; i++) {
            if (contributions[i].lender == msg.sender) {
                votingPower = contributions[i].amount;
                break;
            }
        }
        
        require(votingPower > 0, "Not a lender");
        
        hasVoted[_loanId][msg.sender] = true;
        defaultVotes[_loanId][_action] += votingPower;
        
        emit VoteCast(_loanId, msg.sender, _action, votingPower);
    }
    
    /**
     * @dev Execute default action based on votes
     */
    function executeDefaultAction(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.status == LoanStatus.VOTING, "Not in voting state");
        require(block.timestamp > votingDeadline[_loanId], "Voting still active");
        
        // Determine winning action
        uint256 liquidateVotes = defaultVotes[_loanId][DefaultAction.LIQUIDATE];
        uint256 claimVotes = defaultVotes[_loanId][DefaultAction.CLAIM_PROPORTIONAL];
        
        DefaultAction winningAction = liquidateVotes >= claimVotes ? 
            DefaultAction.LIQUIDATE : DefaultAction.CLAIM_PROPORTIONAL;
        
        loan.status = LoanStatus.DEFAULTED;
        
        if (winningAction == DefaultAction.LIQUIDATE) {
            // Liquidate collateral and distribute proceeds
            _liquidateAndDistribute(_loanId);
        } else {
            // Allow lenders to claim proportional collateral
            _enableProportionalClaim(_loanId);
        }
        
        emit DefaultActionExecuted(_loanId, winningAction);
    }
    
    /**
     * @dev Liquidate collateral and distribute proceeds to lenders
     */
    function _liquidateAndDistribute(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        LenderContribution[] storage contributions = loanContributions[_loanId];
        
        // Distribute collateral proportionally
        for (uint256 i = 0; i < contributions.length; i++) {
            uint256 lenderShare = (loan.collateralAmount * contributions[i].amount) / loan.amount;
            
            if (lenderShare > 0) {
                if (supportedTokens[loan.collateralTokenId].tokenType == TokenType.ETH) {
                    (bool success, ) = payable(contributions[i].lender).call{value: lenderShare}("");
                    require(success, "Collateral distribution failed");
                } else {
                    IERC20 collateralToken = IERC20(supportedTokens[loan.collateralTokenId].contractAddress);
                    collateralToken.safeTransfer(contributions[i].lender, lenderShare);
                }
            }
        }
    }
    
    /**
     * @dev Enable proportional collateral claim
     */
    function _enableProportionalClaim(uint256 _loanId) internal {
        // Same as liquidateAndDistribute for now
        _liquidateAndDistribute(_loanId);
    }
    
    /**
     * @dev Cancel unfunded loan
     */
    function cancelLoan(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Only borrower can cancel");
        require(loan.status == LoanStatus.REQUESTED, "Can only cancel unfunded loans");
        require(loan.amountFunded == 0, "Cannot cancel partially funded loan");
        
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
     * @dev Internal function to refund lender
     */
    function _refundLender(uint256 _loanId, address _lender, uint256 _amount) internal {
        Loan storage loan = loans[_loanId];
        
        if (supportedTokens[loan.tokenId].tokenType == TokenType.ETH) {
            (bool success, ) = payable(_lender).call{value: _amount}("");
            require(success, "Refund failed");
        } else {
            IERC20 token = IERC20(supportedTokens[loan.tokenId].contractAddress);
            token.safeTransfer(_lender, _amount);
        }
        
        emit RefundIssued(_loanId, _lender, _amount);
    }
    
    /**
     * @dev Internal function to update credit score
     */
    function _updateCreditScore(address _borrower, bool _repaid) internal {
        CreditScore storage score = creditScores[_borrower];
        
        if (score.totalLoansCount == 0) {
            score.score = 575; // Starting score
        }
        
        score.totalLoansCount++;
        score.lastUpdated = block.timestamp;
        
        if (_repaid) {
            score.repaidLoansCount++;
            score.score = score.score + 10 > 850 ? 850 : score.score + 10;
        } else {
            score.defaultedLoansCount++;
            score.score = score.score > 50 ? (score.score - 50 < 300 ? 300 : score.score - 50) : 300;
        }
        
        emit CreditScoreUpdated(_borrower, score.score);
    }
    
    /**
     * @dev Get all lenders for a loan
     */
    function getLoanLenders(uint256 _loanId) external view returns (address[] memory, uint256[] memory) {
        LenderContribution[] memory contributions = loanContributions[_loanId];
        address[] memory lenders = new address[](contributions.length);
        uint256[] memory amounts = new uint256[](contributions.length);
        
        for (uint256 i = 0; i < contributions.length; i++) {
            lenders[i] = contributions[i].lender;
            amounts[i] = contributions[i].amount;
        }
        
        return (lenders, amounts);
    }
    
    /**
     * @dev Get active loan requests for funding
     */
    function getActiveLoanRequests() external view returns (uint256[] memory) {
        uint256[] memory activeLoanIds = new uint256[](nextLoanId - 1);
        uint256 count = 0;
        
        for (uint256 i = 1; i < nextLoanId; i++) {
            if (loans[i].status == LoanStatus.REQUESTED && block.timestamp <= loans[i].fundingDeadline) {
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
