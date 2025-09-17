// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LoanChain
 * @dev Decentralized peer-to-peer lending platform with collateralized loans
 */
contract LoanChain is ReentrancyGuard, Ownable {
    
    enum LoanStatus { 
        REQUESTED,    // Loan requested by borrower
        FUNDED,       // Loan funded by lender
        REPAID,       // Loan fully repaid
        DEFAULTED     // Loan defaulted (collateral liquidated)
    }
    
    struct Loan {
        uint256 id;
        address borrower;
        address lender;
        uint256 amount;           // Loan amount in wei
        uint256 collateral;      // Collateral amount in wei
        uint256 interestRate;    // Interest rate (basis points, e.g., 500 = 5%)
        uint256 duration;        // Loan duration in seconds
        uint256 createdAt;       // Timestamp when loan was created
        uint256 fundedAt;        // Timestamp when loan was funded
        uint256 dueDate;         // When loan must be repaid
        LoanStatus status;
        bool collateralClaimed;  // Whether collateral has been claimed
    }
    
    // State variables
    uint256 public nextLoanId = 1;
    uint256 public constant MIN_COLLATERAL_RATIO = 150; // 150% collateralization
    uint256 public constant MAX_INTEREST_RATE = 2000;   // 20% max interest
    uint256 public constant MIN_LOAN_DURATION = 1 days;
    uint256 public constant MAX_LOAN_DURATION = 365 days;
    
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderLoans;
    
    // Events
    event LoanRequested(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount,
        uint256 collateral,
        uint256 interestRate,
        uint256 duration
    );
    
    event LoanFunded(
        uint256 indexed loanId,
        address indexed lender,
        uint256 fundedAt
    );
    
    event LoanRepaid(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 repaidAmount
    );
    
    event LoanDefaulted(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender
    );
    
    event CollateralClaimed(
        uint256 indexed loanId,
        address indexed claimer,
        uint256 amount
    );
    
    constructor() {}
    
    /**
     * @dev Request a new loan with collateral
     * @param _amount Loan amount in wei
     * @param _interestRate Interest rate in basis points
     * @param _duration Loan duration in seconds
     */
    function requestLoan(
        uint256 _amount,
        uint256 _interestRate,
        uint256 _duration
    ) external payable nonReentrant {
        require(_amount > 0, "Loan amount must be greater than 0");
        require(_interestRate <= MAX_INTEREST_RATE, "Interest rate too high");
        require(_duration >= MIN_LOAN_DURATION && _duration <= MAX_LOAN_DURATION, "Invalid loan duration");
        
        uint256 requiredCollateral = (_amount * MIN_COLLATERAL_RATIO) / 100;
        require(msg.value >= requiredCollateral, "Insufficient collateral");
        
        uint256 loanId = nextLoanId++;
        
        loans[loanId] = Loan({
            id: loanId,
            borrower: msg.sender,
            lender: address(0),
            amount: _amount,
            collateral: msg.value,
            interestRate: _interestRate,
            duration: _duration,
            createdAt: block.timestamp,
            fundedAt: 0,
            dueDate: 0,
            status: LoanStatus.REQUESTED,
            collateralClaimed: false
        });
        
        borrowerLoans[msg.sender].push(loanId);
        
        emit LoanRequested(loanId, msg.sender, _amount, msg.value, _interestRate, _duration);
    }
    
    /**
     * @dev Fund a requested loan
     * @param _loanId ID of the loan to fund
     */
    function fundLoan(uint256 _loanId) external payable nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.borrower != address(0), "Loan does not exist");
        require(loan.status == LoanStatus.REQUESTED, "Loan not available for funding");
        require(msg.sender != loan.borrower, "Cannot fund your own loan");
        require(msg.value == loan.amount, "Incorrect funding amount");
        
        loan.lender = msg.sender;
        loan.status = LoanStatus.FUNDED;
        loan.fundedAt = block.timestamp;
        loan.dueDate = block.timestamp + loan.duration;
        
        lenderLoans[msg.sender].push(_loanId);
        
        // Transfer loan amount to borrower
        payable(loan.borrower).transfer(loan.amount);
        
        emit LoanFunded(_loanId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Repay a loan with interest
     * @param _loanId ID of the loan to repay
     */
    function repayLoan(uint256 _loanId) external payable nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Only borrower can repay");
        require(loan.status == LoanStatus.FUNDED, "Loan not active");
        require(block.timestamp <= loan.dueDate, "Loan has expired");
        
        uint256 interest = (loan.amount * loan.interestRate) / 10000;
        uint256 totalRepayment = loan.amount + interest;
        require(msg.value >= totalRepayment, "Insufficient repayment amount");
        
        loan.status = LoanStatus.REPAID;
        
        // Transfer repayment to lender
        payable(loan.lender).transfer(totalRepayment);
        
        // Return collateral to borrower
        payable(loan.borrower).transfer(loan.collateral);
        
        // Return excess payment if any
        if (msg.value > totalRepayment) {
            payable(msg.sender).transfer(msg.value - totalRepayment);
        }
        
        emit LoanRepaid(_loanId, msg.sender, totalRepayment);
    }
    
    /**
     * @dev Claim collateral after loan default
     * @param _loanId ID of the defaulted loan
     */
    function claimCollateral(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.lender == msg.sender, "Only lender can claim collateral");
        require(loan.status == LoanStatus.FUNDED, "Loan not active");
        require(block.timestamp > loan.dueDate, "Loan not yet expired");
        require(!loan.collateralClaimed, "Collateral already claimed");
        
        loan.status = LoanStatus.DEFAULTED;
        loan.collateralClaimed = true;
        
        // Transfer collateral to lender
        payable(loan.lender).transfer(loan.collateral);
        
        emit LoanDefaulted(_loanId, loan.borrower, loan.lender);
        emit CollateralClaimed(_loanId, msg.sender, loan.collateral);
    }
    
    /**
     * @dev Cancel a loan request (only if not funded)
     * @param _loanId ID of the loan to cancel
     */
    function cancelLoan(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Only borrower can cancel");
        require(loan.status == LoanStatus.REQUESTED, "Can only cancel unfunded loans");
        
        loan.status = LoanStatus.DEFAULTED; // Reuse status for cancelled
        
        // Return collateral to borrower
        payable(loan.borrower).transfer(loan.collateral);
    }
    
    /**
     * @dev Get loan details
     * @param _loanId ID of the loan
     */
    function getLoan(uint256 _loanId) external view returns (Loan memory) {
        return loans[_loanId];
    }
    
    /**
     * @dev Get all loan IDs for a borrower
     * @param _borrower Address of the borrower
     */
    function getBorrowerLoans(address _borrower) external view returns (uint256[] memory) {
        return borrowerLoans[_borrower];
    }
    
    /**
     * @dev Get all loan IDs for a lender
     * @param _lender Address of the lender
     */
    function getLenderLoans(address _lender) external view returns (uint256[] memory) {
        return lenderLoans[_lender];
    }
    
    /**
     * @dev Calculate total repayment amount for a loan
     * @param _loanId ID of the loan
     */
    function calculateRepaymentAmount(uint256 _loanId) external view returns (uint256) {
        Loan memory loan = loans[_loanId];
        uint256 interest = (loan.amount * loan.interestRate) / 10000;
        return loan.amount + interest;
    }
    
    /**
     * @dev Get all active loan requests (for lenders to browse)
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
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeLoanIds[i];
        }
        
        return result;
    }
}