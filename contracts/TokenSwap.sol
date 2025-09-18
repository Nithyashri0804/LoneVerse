// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./TokenTypes.sol";

// Interface to interact with LoanChainV2 for price data
interface ILoanChainV2 {
    function getTokenPrice(TokenType _tokenType) external view returns (uint256);
    function getSupportedToken(TokenType _tokenType) external view returns (
        address contractAddress,
        TokenType tokenType,
        uint8 decimals,
        bool isActive,
        uint256 minLoanAmount,
        uint256 maxLoanAmount
    );
    function calculateUSDValue(TokenType _tokenType, uint256 _amount) external view returns (uint256);
}

/**
 * @title TokenSwap
 * @dev Simple token swap functionality using price oracle for fair exchange rates
 */
contract TokenSwap is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    
    struct SwapParams {
        TokenType fromToken;
        TokenType toToken;
        uint256 amountIn;
        uint256 minAmountOut;  // Slippage protection
        address to;            // Recipient address
    }
    
    // Platform configuration
    ILoanChainV2 public loanChain;
    uint256 public swapFeeRate = 30; // 0.3% fee in basis points
    uint256 public constant MAX_FEE_RATE = 300; // Max 3% fee
    
    // Fee collection
    mapping(TokenType => uint256) public collectedFees;
    
    // Events
    event Swap(
        address indexed user,
        TokenType indexed fromToken,
        TokenType indexed toToken,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );
    event FeeRateUpdated(uint256 oldRate, uint256 newRate);
    event FeesWithdrawn(TokenType indexed token, uint256 amount);
    
    constructor(address _loanChainAddress) Ownable(msg.sender) {
        require(_loanChainAddress != address(0), "Invalid LoanChain address");
        loanChain = ILoanChainV2(_loanChainAddress);
    }
    
    /**
     * @dev Update swap fee rate (max 3%)
     */
    function setSwapFeeRate(uint256 _feeRate) external onlyOwner {
        require(_feeRate <= MAX_FEE_RATE, "Fee rate too high");
        uint256 oldRate = swapFeeRate;
        swapFeeRate = _feeRate;
        emit FeeRateUpdated(oldRate, _feeRate);
    }
    
    /**
     * @dev Get swap quote for given input
     */
    function getSwapQuote(
        TokenType _fromToken, 
        TokenType _toToken, 
        uint256 _amountIn
    ) external view returns (
        uint256 amountOut,
        uint256 fee,
        uint256 exchangeRate
    ) {
        require(_fromToken != _toToken, "Cannot swap same token");
        
        // Get price data from oracle
        uint256 fromPrice = loanChain.getTokenPrice(_fromToken);
        uint256 toPrice = loanChain.getTokenPrice(_toToken);
        
        // Get token decimals
        (, , uint8 fromDecimals, , , ) = loanChain.getSupportedToken(_fromToken);
        (, , uint8 toDecimals, , , ) = loanChain.getSupportedToken(_toToken);
        
        // Calculate USD value of input amount
        uint256 usdValue = (_amountIn * fromPrice) / (10 ** fromDecimals);
        
        // Calculate output amount before fees
        uint256 grossAmountOut = (usdValue * (10 ** toDecimals)) / toPrice;
        
        // Calculate swap fee
        fee = (grossAmountOut * swapFeeRate) / 10000;
        amountOut = grossAmountOut - fee;
        
        // Exchange rate (how much of toToken per 1 fromToken)
        exchangeRate = (10 ** fromDecimals * fromPrice) / toPrice;
        
        return (amountOut, fee, exchangeRate);
    }
    
    /**
     * @dev Execute token swap
     */
    function swap(SwapParams calldata params) external payable nonReentrant {
        require(params.fromToken != params.toToken, "Cannot swap same token");
        require(params.amountIn > 0, "Amount must be positive");
        require(params.to != address(0), "Invalid recipient");
        
        // Get swap quote
        (uint256 amountOut, uint256 fee, ) = this.getSwapQuote(
            params.fromToken,
            params.toToken,
            params.amountIn
        );
        
        // Check slippage protection
        require(amountOut >= params.minAmountOut, "Slippage too high");
        
        // Handle input token transfer
        _handleTokenInput(params.fromToken, params.amountIn, msg.sender);
        
        // Handle output token transfer  
        _handleTokenOutput(params.toToken, amountOut, params.to);
        
        // Track fees
        collectedFees[params.toToken] += fee;
        
        emit Swap(
            msg.sender,
            params.fromToken,
            params.toToken,
            params.amountIn,
            amountOut,
            fee
        );
    }
    
    /**
     * @dev Handle input token transfer (from user to contract)
     */
    function _handleTokenInput(
        TokenType _token, 
        uint256 _amount, 
        address _from
    ) private {
        if (_token == TokenType.NATIVE_ETH) {
            require(msg.value == _amount, "ETH amount mismatch");
        } else {
            require(msg.value == 0, "No ETH should be sent");
            (address contractAddress, , , , , ) = loanChain.getSupportedToken(_token);
            IERC20(contractAddress).safeTransferFrom(_from, address(this), _amount);
        }
    }
    
    /**
     * @dev Handle output token transfer (from contract to recipient)
     */
    function _handleTokenOutput(
        TokenType _token,
        uint256 _amount,
        address _to
    ) private {
        if (_token == TokenType.NATIVE_ETH) {
            (bool success, ) = _to.call{value: _amount}("");
            require(success, "ETH transfer failed");
        } else {
            (address contractAddress, , , , , ) = loanChain.getSupportedToken(_token);
            IERC20(contractAddress).safeTransfer(_to, _amount);
        }
    }
    
    /**
     * @dev Withdraw collected fees (owner only)
     */
    function withdrawFees(TokenType _token) external onlyOwner {
        uint256 amount = collectedFees[_token];
        require(amount > 0, "No fees to withdraw");
        
        collectedFees[_token] = 0;
        _handleTokenOutput(_token, amount, owner());
        
        emit FeesWithdrawn(_token, amount);
    }
    
    /**
     * @dev Get available liquidity for a token
     */
    function getTokenBalance(TokenType _token) external view returns (uint256) {
        if (_token == TokenType.NATIVE_ETH) {
            return address(this).balance;
        } else {
            (address contractAddress, , , , , ) = loanChain.getSupportedToken(_token);
            return IERC20(contractAddress).balanceOf(address(this));
        }
    }
    
    /**
     * @dev Emergency function to add liquidity (owner only)
     */
    function addLiquidity(TokenType _token, uint256 _amount) external payable onlyOwner {
        if (_token == TokenType.NATIVE_ETH) {
            require(msg.value == _amount, "ETH amount mismatch");
        } else {
            require(msg.value == 0, "No ETH should be sent");
            (address contractAddress, , , , , ) = loanChain.getSupportedToken(_token);
            IERC20(contractAddress).safeTransferFrom(msg.sender, address(this), _amount);
        }
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}