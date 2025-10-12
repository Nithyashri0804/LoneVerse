import { GoogleGenAI } from '@google/genai';

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// Lazy-load Gemini AI client to avoid errors when API key is not set
let ai = null;

function getGeminiClient() {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

/**
 * AI Chatbot Service for LoanVerse
 * Provides customer support and DeFi lending information using Google Gemini
 */

// System prompt with context about the platform
const SYSTEM_PROMPT = `You are an AI assistant for LoanVerse, a comprehensive DeFi lending platform with AI-powered credit scoring.

Platform Overview:
- LoanVerse is a decentralized peer-to-peer lending platform on Ethereum
- Features AI-powered credit scoring using on-chain wallet analysis
- Credit scores range from 300-850 (similar to traditional FICO scores)
- Multi-token support with Chainlink price feeds
- Real-time collateral monitoring and liquidation mechanisms

Credit Scoring Algorithm:
The system uses a weighted algorithm to calculate credit scores:
1. Transaction Analysis (30%): Transaction count, volume, frequency, and patterns
2. Portfolio Stability (25%): Stablecoin ratio, holding period, volatility index, diversity
3. Lending History (25%): Repayment rate, default count, active loans, total borrowed/repaid
4. DeFi Behavior (20%): Protocol interactions, yield farming activity, smart contract usage, DeFi experience

Key Features:
- On-chain wallet analysis using real blockchain data (Etherscan API)
- Multi-token collateral support (ETH, USDC, USDT, DAI, WBTC, LINK)
- Automated liquidation when collateral falls below threshold
- Interest rate calculation based on credit score and risk profile
- Real-time price feeds via Chainlink oracles

How to help users:
- Explain how the credit scoring system works
- Guide users through the lending/borrowing process
- Answer questions about collateral, interest rates, and liquidation
- Provide general DeFi lending education
- Help troubleshoot common issues

Important: Be helpful, accurate, and professional. If you're unsure about something, acknowledge it and suggest checking the documentation or contacting support.`;

/**
 * Generate AI chatbot response
 * @param {string} userMessage - The user's message
 * @param {Array} conversationHistory - Previous messages in the conversation
 * @returns {object} AI response with message and metadata
 */
export async function generateChatResponse(userMessage, conversationHistory = []) {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return {
        success: false,
        error: 'Gemini API key not configured. Please set GEMINI_API_KEY environment variable.',
        message: 'I apologize, but the AI chatbot is not currently configured. Please contact support for assistance.'
      };
    }

    // Get Gemini client
    const client = getGeminiClient();
    if (!client) {
      throw new Error('Gemini client not initialized');
    }

    console.log(`🤖 Generating AI response for: "${userMessage.substring(0, 50)}..."`);

    // Build conversation context
    let conversationContext = SYSTEM_PROMPT + '\n\n';
    
    // Add conversation history (last 10 messages)
    const recentHistory = conversationHistory.slice(-10);
    if (recentHistory.length > 0) {
      conversationContext += 'Previous conversation:\n';
      recentHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        conversationContext += `${role}: ${msg.content}\n`;
      });
      conversationContext += '\n';
    }
    
    conversationContext += `User: ${userMessage}\nAssistant:`;

    // Call Gemini API using gemini-2.5-flash (free tier model)
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: conversationContext,
    });

    const aiMessage = response.text || 'I apologize, but I could not generate a response.';

    return {
      success: true,
      message: aiMessage,
      model: 'gemini-2.5-flash',
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Handle specific Gemini errors
    if (error.message?.includes('API key')) {
      return {
        success: false,
        error: 'Invalid Gemini API key',
        message: 'Authentication failed. Please check the API key configuration.'
      };
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return {
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again in a moment.'
      };
    } else {
      return {
        success: false,
        error: error.message || 'Unknown error',
        message: 'I apologize, but I encountered an error processing your request. Please try again.'
      };
    }
  }
}

/**
 * Analyze user question intent
 * Determines the category of the user's question for routing or analytics
 * @param {string} question - User's question
 * @returns {object} Intent analysis result
 */
export async function analyzeQuestionIntent(question) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { category: 'unknown', confidence: 0 };
    }

    const client = getGeminiClient();
    if (!client) {
      throw new Error('Gemini client not initialized');
    }

    const systemPrompt = `You are a question categorization expert. 
Analyze the user's question and categorize it. Categories: credit_scoring, lending_process, borrowing, collateral, interest_rates, liquidation, defi_general, platform_features, troubleshooting, other. 

Respond with JSON in this format: { "category": "category_name", "confidence": 0.0-1.0, "keywords": ["word1", "word2"] }`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-pro',
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            confidence: { type: 'number' },
            keywords: { type: 'array', items: { type: 'string' } }
          },
          required: ['category', 'confidence', 'keywords']
        }
      },
      contents: question
    });

    const rawJson = response.text;
    if (rawJson) {
      const result = JSON.parse(rawJson);
      return result;
    }
    
    return { category: 'unknown', confidence: 0, keywords: [] };

  } catch (error) {
    console.error('Error analyzing question intent:', error);
    return { category: 'unknown', confidence: 0, error: error.message };
  }
}

/**
 * Generate FAQ suggestions based on user's question
 * @param {string} question - User's question
 * @returns {Array} Array of suggested FAQ topics
 */
export async function generateFAQSuggestions(question) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return [];
    }

    const client = getGeminiClient();
    if (!client) {
      throw new Error('Gemini client not initialized');
    }

    const systemPrompt = `Based on the user's question, suggest 3-5 related FAQ topics they might be interested in about DeFi lending, credit scoring, or the LoanVerse platform. 

Respond with JSON in this format: { "suggestions": ["topic1", "topic2", "topic3"] }`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            suggestions: { type: 'array', items: { type: 'string' } }
          },
          required: ['suggestions']
        }
      },
      contents: question
    });

    const rawJson = response.text;
    if (rawJson) {
      const result = JSON.parse(rawJson);
      return result.suggestions || [];
    }
    
    return [];

  } catch (error) {
    console.error('Error generating FAQ suggestions:', error);
    return [];
  }
}

export default {
  generateChatResponse,
  analyzeQuestionIntent,
  generateFAQSuggestions
};
