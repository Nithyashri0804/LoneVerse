import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import riskAnalyticsRoutes from './routes/riskAnalytics.js';
import loanAnalyticsRoutes from './routes/loanAnalytics.js';
import notificationRoutes from './routes/notifications.js';
import ipfsRoutes from './routes/ipfs.js';
import { initializeMLModel } from './services/mlService.js';
import { startRiskMonitoring } from './services/monitoringService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/risk', riskAnalyticsRoutes);
app.use('/api/analytics', loanAnalyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ipfs', ipfsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
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
    
    // Initialize ML model
    await initializeMLModel();
    console.log('✅ ML model initialized');
    
    // Start risk monitoring service
    startRiskMonitoring();
    console.log('✅ Risk monitoring started');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌟 LoanVerse Backend running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;