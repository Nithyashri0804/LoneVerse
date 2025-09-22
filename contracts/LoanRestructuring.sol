// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LoanRestructuring
 * @dev Smart contract for proposing and voting on loan restructuring
 */
contract LoanRestructuring is ReentrancyGuard, Ownable {
    struct RestructuringProposal {
        uint256 loanId;
        address proposer; // Can be borrower or lender
        ProposalType proposalType;
        uint256 newInterestRate;
        uint256 newDuration;
        uint256 additionalCollateral;
        uint256 reducedPrincipal;
        string reason;
        uint256 proposedAt;
        uint256 votingDeadline;
        ProposalStatus status;
        uint256 approvalVotes;
        uint256 rejectionVotes;
        mapping(address => bool) hasVoted;
        mapping(address => bool) voteChoice; // true = approve, false = reject
    }

    enum ProposalType {
        EXTEND_DURATION,
        REDUCE_INTEREST,
        INCREASE_COLLATERAL,
        PARTIAL_FORGIVENESS,
        PAYMENT_PLAN,
        EMERGENCY_RESTRUCTURE
    }

    enum ProposalStatus {
        PENDING,
        APPROVED,
        REJECTED,
        EXECUTED,
        EXPIRED
    }

    // State variables
    mapping(uint256 => RestructuringProposal) public proposals;
    mapping(uint256 => uint256[]) public loanProposals; // loanId => proposalIds
    uint256 public nextProposalId = 1;
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant MIN_VOTING_THRESHOLD = 51; // 51% approval needed

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        uint256 indexed loanId,
        address indexed proposer,
        ProposalType proposalType
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool choice,
        uint256 weight
    );
    
    event ProposalExecuted(
        uint256 indexed proposalId,
        uint256 indexed loanId,
        ProposalStatus status
    );

    // Interface for the main loan contract
    interface ILoanChain {
        function getLoan(uint256 loanId) external view returns (
            uint256 id,
            address borrower,
            address lender,
            uint256 amount,
            uint256 collateralAmount,
            uint256 interestRate,
            uint256 duration,
            uint256 createdAt,
            uint256 fundedAt,
            uint256 dueDate,
            uint8 status,
            bool collateralClaimed
        );
        function borrowerLoans(address borrower) external view returns (uint256[] memory);
        function lenderLoans(address lender) external view returns (uint256[] memory);
    }

    ILoanChain public loanContract;

    constructor(address _loanContract) {
        loanContract = ILoanChain(_loanContract);
    }

    modifier onlyStakeholder(uint256 loanId) {
        (, address borrower, address lender, , , , , , , , , ) = loanContract.getLoan(loanId);
        require(msg.sender == borrower || msg.sender == lender, "Not a stakeholder");
        _;
    }

    /**
     * @dev Create a restructuring proposal
     */
    function createProposal(
        uint256 _loanId,
        ProposalType _proposalType,
        uint256 _newInterestRate,
        uint256 _newDuration,
        uint256 _additionalCollateral,
        uint256 _reducedPrincipal,
        string memory _reason
    ) external onlyStakeholder(_loanId) returns (uint256) {
        require(bytes(_reason).length > 0, "Reason required");
        
        uint256 proposalId = nextProposalId++;
        RestructuringProposal storage proposal = proposals[proposalId];
        
        proposal.loanId = _loanId;
        proposal.proposer = msg.sender;
        proposal.proposalType = _proposalType;
        proposal.newInterestRate = _newInterestRate;
        proposal.newDuration = _newDuration;
        proposal.additionalCollateral = _additionalCollateral;
        proposal.reducedPrincipal = _reducedPrincipal;
        proposal.reason = _reason;
        proposal.proposedAt = block.timestamp;
        proposal.votingDeadline = block.timestamp + VOTING_PERIOD;
        proposal.status = ProposalStatus.PENDING;
        
        loanProposals[_loanId].push(proposalId);
        
        emit ProposalCreated(proposalId, _loanId, msg.sender, _proposalType);
        
        return proposalId;
    }

    /**
     * @dev Vote on a restructuring proposal
     */
    function vote(uint256 _proposalId, bool _approve) external {
        RestructuringProposal storage proposal = proposals[_proposalId];
        
        require(proposal.proposedAt > 0, "Proposal does not exist");
        require(block.timestamp <= proposal.votingDeadline, "Voting period ended");
        require(proposal.status == ProposalStatus.PENDING, "Proposal not pending");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        // Calculate voting weight (this could be based on stake in the loan)
        uint256 weight = calculateVotingWeight(msg.sender, proposal.loanId);
        require(weight > 0, "No voting rights");
        
        proposal.hasVoted[msg.sender] = true;
        proposal.voteChoice[msg.sender] = _approve;
        
        if (_approve) {
            proposal.approvalVotes += weight;
        } else {
            proposal.rejectionVotes += weight;
        }
        
        emit VoteCast(_proposalId, msg.sender, _approve, weight);
        
        // Check if proposal can be resolved early
        _checkEarlyResolution(_proposalId);
    }

    /**
     * @dev Execute a proposal after voting period
     */
    function executeProposal(uint256 _proposalId) external nonReentrant {
        RestructuringProposal storage proposal = proposals[_proposalId];
        
        require(proposal.proposedAt > 0, "Proposal does not exist");
        require(proposal.status == ProposalStatus.PENDING, "Proposal not pending");
        require(block.timestamp > proposal.votingDeadline, "Voting still active");
        
        uint256 totalVotes = proposal.approvalVotes + proposal.rejectionVotes;
        require(totalVotes > 0, "No votes cast");
        
        uint256 approvalPercentage = (proposal.approvalVotes * 100) / totalVotes;
        
        if (approvalPercentage >= MIN_VOTING_THRESHOLD) {
            proposal.status = ProposalStatus.APPROVED;
            _executeRestructuring(_proposalId);
        } else {
            proposal.status = ProposalStatus.REJECTED;
        }
        
        emit ProposalExecuted(_proposalId, proposal.loanId, proposal.status);
    }

    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 _proposalId) external view returns (
        uint256 loanId,
        address proposer,
        ProposalType proposalType,
        uint256 newInterestRate,
        uint256 newDuration,
        uint256 additionalCollateral,
        uint256 reducedPrincipal,
        string memory reason,
        uint256 proposedAt,
        uint256 votingDeadline,
        ProposalStatus status,
        uint256 approvalVotes,
        uint256 rejectionVotes
    ) {
        RestructuringProposal storage proposal = proposals[_proposalId];
        return (
            proposal.loanId,
            proposal.proposer,
            proposal.proposalType,
            proposal.newInterestRate,
            proposal.newDuration,
            proposal.additionalCollateral,
            proposal.reducedPrincipal,
            proposal.reason,
            proposal.proposedAt,
            proposal.votingDeadline,
            proposal.status,
            proposal.approvalVotes,
            proposal.rejectionVotes
        );
    }

    /**
     * @dev Get all proposals for a loan
     */
    function getLoanProposals(uint256 _loanId) external view returns (uint256[] memory) {
        return loanProposals[_loanId];
    }

    /**
     * @dev Calculate voting weight for an address
     * This is a simplified version - would integrate with main loan contract
     */
    function calculateVotingWeight(address _voter, uint256 _loanId) public pure returns (uint256) {
        // Simplified: equal weight for all stakeholders
        // In practice, this would be based on their stake in the loan
        return 1;
    }

    /**
     * @dev Check if proposal can be resolved early
     */
    function _checkEarlyResolution(uint256 _proposalId) internal {
        RestructuringProposal storage proposal = proposals[_proposalId];
        
        uint256 totalVotes = proposal.approvalVotes + proposal.rejectionVotes;
        if (totalVotes == 0) return;
        
        uint256 approvalPercentage = (proposal.approvalVotes * 100) / totalVotes;
        
        // Early approval if >75% approval with significant participation
        if (approvalPercentage > 75 && totalVotes >= 3) {
            proposal.status = ProposalStatus.APPROVED;
            _executeRestructuring(_proposalId);
            emit ProposalExecuted(_proposalId, proposal.loanId, proposal.status);
        }
        // Early rejection if <25% approval with significant participation
        else if (approvalPercentage < 25 && totalVotes >= 3) {
            proposal.status = ProposalStatus.REJECTED;
            emit ProposalExecuted(_proposalId, proposal.loanId, proposal.status);
        }
    }

    /**
     * @dev Execute the restructuring changes
     * This would integrate with the main loan contract
     */
    function _executeRestructuring(uint256 _proposalId) internal {
        RestructuringProposal storage proposal = proposals[_proposalId];
        proposal.status = ProposalStatus.EXECUTED;
        
        // Integration point with main loan contract
        // This would call functions on the main contract to:
        // - Update interest rate
        // - Extend duration
        // - Handle additional collateral
        // - Process partial forgiveness
        
        // For now, this is a placeholder
        // In practice, this would make external calls to update the loan
    }

    /**
     * @dev Emergency restructuring for critical situations
     * Only contract owner can initiate
     */
    function emergencyRestructure(
        uint256 _loanId,
        uint256 _newInterestRate,
        uint256 _newDuration,
        string memory _reason
    ) external onlyOwner {
        uint256 proposalId = nextProposalId++;
        RestructuringProposal storage proposal = proposals[proposalId];
        
        proposal.loanId = _loanId;
        proposal.proposer = msg.sender;
        proposal.proposalType = ProposalType.EMERGENCY_RESTRUCTURE;
        proposal.newInterestRate = _newInterestRate;
        proposal.newDuration = _newDuration;
        proposal.reason = _reason;
        proposal.proposedAt = block.timestamp;
        proposal.votingDeadline = block.timestamp; // Immediate execution
        proposal.status = ProposalStatus.APPROVED;
        
        loanProposals[_loanId].push(proposalId);
        
        _executeRestructuring(proposalId);
        
        emit ProposalCreated(proposalId, _loanId, msg.sender, ProposalType.EMERGENCY_RESTRUCTURE);
        emit ProposalExecuted(proposalId, _loanId, ProposalStatus.EXECUTED);
    }

    /**
     * @dev Expire old proposals that weren't executed
     */
    function expireProposal(uint256 _proposalId) external {
        RestructuringProposal storage proposal = proposals[_proposalId];
        
        require(proposal.proposedAt > 0, "Proposal does not exist");
        require(proposal.status == ProposalStatus.PENDING, "Proposal not pending");
        require(block.timestamp > proposal.votingDeadline + 1 days, "Cannot expire yet");
        
        proposal.status = ProposalStatus.EXPIRED;
        emit ProposalExecuted(_proposalId, proposal.loanId, ProposalStatus.EXPIRED);
    }
}