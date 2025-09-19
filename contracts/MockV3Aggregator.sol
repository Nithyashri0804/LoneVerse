// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockV3Aggregator
 * @dev Mock Chainlink Price Feed for testing
 */
contract MockV3Aggregator {
    uint256 public constant VERSION = 1;
    uint8 public decimals;
    string public description = "Mock ETH/USD Price Feed";
    
    uint80 private currentRoundId = 1;
    int256 private currentAnswer;
    uint256 private currentTimestamp;
    
    event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 timestamp);
    
    constructor(uint8 _decimals, int256 _initialAnswer) {
        decimals = _decimals;
        currentAnswer = _initialAnswer;
        currentTimestamp = block.timestamp;
    }
    
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            currentRoundId,
            currentAnswer,
            currentTimestamp,
            currentTimestamp,
            currentRoundId
        );
    }
    
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        require(_roundId <= currentRoundId, "Round ID too high");
        return (
            _roundId,
            currentAnswer,
            currentTimestamp,
            currentTimestamp,
            _roundId
        );
    }
    
    function updateAnswer(int256 _answer) external {
        currentAnswer = _answer;
        currentTimestamp = block.timestamp;
        currentRoundId++;
        
        emit AnswerUpdated(_answer, currentRoundId, currentTimestamp);
    }
    
    function updateRoundData(
        uint80 _roundId,
        int256 _answer,
        uint256 _timestamp,
        uint256 _startedAt
    ) external {
        currentRoundId = _roundId;
        currentAnswer = _answer;
        currentTimestamp = _timestamp;
    }
}