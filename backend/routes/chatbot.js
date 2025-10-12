import express from 'express';
import { 
  generateChatResponse, 
  analyzeQuestionIntent, 
  generateFAQSuggestions 
} from '../services/chatbotService.js';

const router = express.Router();

/**
 * POST /api/chatbot/chat
 * Generate AI chatbot response
 * 
 * Body:
 * - message: User's message (required)
 * - conversationHistory: Array of previous messages (optional)
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a non-empty string'
      });
    }

    // Validate conversation history format
    if (!Array.isArray(conversationHistory)) {
      return res.status(400).json({
        success: false,
        error: 'conversationHistory must be an array'
      });
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return res.status(200).json({
        success: false,
        configured: false,
        message: 'AI chatbot is not configured. Please set GEMINI_API_KEY environment variable. Get a free API key at https://aistudio.google.com/apikey',
        error: 'Gemini API key not configured'
      });
    }

    // Generate AI response
    const response = await generateChatResponse(message, conversationHistory);

    if (!response.success) {
      // Return appropriate status based on error type
      const status = response.error?.includes('API key') ? 401 : 
                     response.error?.includes('Rate limit') ? 429 : 500;
      return res.status(status).json(response);
    }

    res.json(response);

  } catch (error) {
    console.error('Error in /chat endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process your request'
    });
  }
});

/**
 * POST /api/chatbot/analyze-intent
 * Analyze the intent/category of a user's question
 * 
 * Body:
 * - question: User's question (required)
 */
router.post('/analyze-intent', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Question is required and must be a string'
      });
    }

    const intent = await analyzeQuestionIntent(question);

    res.json({
      success: true,
      intent,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error in /analyze-intent endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/chatbot/faq-suggestions
 * Get FAQ suggestions based on user's question
 * 
 * Body:
 * - question: User's question (required)
 */
router.post('/faq-suggestions', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Question is required and must be a string'
      });
    }

    const suggestions = await generateFAQSuggestions(question);

    res.json({
      success: true,
      suggestions,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error in /faq-suggestions endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/chatbot/status
 * Check chatbot service status
 */
router.get('/status', (req, res) => {
  const isConfigured = !!process.env.GEMINI_API_KEY;
  
  res.json({
    success: true,
    configured: isConfigured,
    model: 'gemini-2.5-flash',
    status: isConfigured ? 'ready' : 'not_configured',
    message: isConfigured 
      ? 'Chatbot is ready to assist' 
      : 'Gemini API key not configured. Get a free API key at https://aistudio.google.com/apikey'
  });
});

export default router;
