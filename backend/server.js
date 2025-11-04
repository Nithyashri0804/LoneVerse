import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import riskAnalyticsRoutes from './routes/riskAnalytics.js';
import loanAnalyticsRoutes from './routes/loanAnalytics.js';
import analyticsRoutes from './routes/analytics.js';
import notificationRoutes from './routes/notifications.js';
import ipfsRoutes from './routes/ipfs.js';
import emailNotificationRoutes from './routes/emailNotifications.js';
import liquidationRoutes from './routes/liquidation.js';
import matchingRoutes from './routes/matching.js';
import creditScoreRoutes from './routes/creditScore.js';
import chatbotRoutes from './routes/chatbot.js';
import datasetRoutes from './routes/dataset.js';
import performanceRoutes from './routes/performance.js';
import mlRiskPredictionRoutes from './routes/mlRiskPrediction.js';
import { initializeMLModel, getMlStatus } from './services/mlService.js';
import { startRiskMonitoring } from './services/monitoringService.js';
import { startLiquidationMonitoring } from './services/liquidationService.js';
import { initializePools, getPoolStats, closeAllPools } from './services/connectionPools.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses behind reverse proxies (critical for rate limiting)
app.set('trust proxy', 1);

// Rate limiting - prevents API abuse
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 20, // limit each IP to 20 requests per windowMs for sensitive endpoints
  message: 'Too many requests to this endpoint, please try again later.'
});

// Middleware
app.use(helmet());
app.use(generalLimiter); // Apply general rate limiting to all routes
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://*.repl.co',
        'https://*.replit.dev',
        'https://*.replit.com',
        /^https:\/\/.*\.replit\.dev$/,
        /^https:\/\/.*\.repl\.co$/
      ]
    : true, // Allow all origins in development
  credentials: true
}));

// Input validation and size limits
app.use(express.json({ 
  limit: '10mb', // Reduced from 50mb for security
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes with different rate limits
app.use('/api/risk', strictLimiter, riskAnalyticsRoutes);        // AI/ML endpoints - limited
app.use('/api/loan-analytics', loanAnalyticsRoutes);             // Read-only - general limit
app.use('/api/analytics', analyticsRoutes);                     // Enhanced analytics - general limit
app.use('/api/notifications', notificationRoutes);              // General limit 
app.use('/api/ipfs', strictLimiter, ipfsRoutes);                // File uploads - limited
app.use('/api/email-notifications', strictLimiter, emailNotificationRoutes); // Email sending - limited
app.use('/api/liquidation', strictLimiter, liquidationRoutes);  // Critical operations - limited
app.use('/api/matching', matchingRoutes);                       // General limit
app.use('/api/credit-score', creditScoreRoutes);                // Credit scoring - general limit
app.use('/api/chatbot', chatbotRoutes);                         // AI chatbot - general limit
app.use('/api/dataset', strictLimiter, datasetRoutes);          // Dataset generation - limited
app.use('/api/performance', performanceRoutes);                 // Performance metrics - general limit
app.use('/api/ml', strictLimiter, mlRiskPredictionRoutes);      // ML logistic regression - limited

// Health check with service status (excluded from rate limiting)
const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Higher limit for health checks
  message: 'Health check rate limit exceeded'
});

app.get('/health', healthLimiter, (req, res) => {
  const mlStatus = getMlStatus();
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      ml: mlStatus.available ? 'enabled' : 'disabled (fallback mode)',
      liquidation: process.env.LIQUIDATOR_PRIVATE_KEY ? 'enabled' : 'disabled'
    }
  });
});

app.get('/api/pools/stats', (req, res) => {
  try {
    const stats = getPoolStats();
    res.json({
      success: true,
      pools: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get pool stats',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize services and start server
async function startServer() {
  try {
    console.log('🚀 Starting LoanVerse Backend...');
    
    // Initialize connection pools
    await initializePools();
    
    // Initialize ML model (optional - graceful fallback)
    const mlStatus = await initializeMLModel();
    if (mlStatus.mlEnabled) {
      console.log('✅ ML model initialized');
    } else {
      console.log(`⚡ Running in ${mlStatus.fallbackMode} mode (ML disabled)`);
    }
    
    // Start risk monitoring service (graceful fallback)
    try {
      startRiskMonitoring();
      console.log('✅ Risk monitoring started');
    } catch (error) {
      console.log('⚠️ Risk monitoring failed to start:', error.message);
    }
    
    // Start liquidation monitoring service (graceful fallback)
    try {
      startLiquidationMonitoring();
      console.log('✅ Liquidation monitoring started');
    } catch (error) {
      console.log('⚠️ Liquidation monitoring failed to start:', error.message);
    }
    
    app.listen(PORT, () => {
      console.log(`🌟 LoanVerse Backend running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🤖 ML Features: ${mlStatus.mlEnabled ? 'Enabled' : 'Disabled'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received, shutting down gracefully...');
  await closeAllPools();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received, shutting down gracefully...');
  await closeAllPools();
  process.exit(0);
});

startServer();

export default app;