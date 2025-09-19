import express from 'express';
import { 
  getLiquidationStatus, 
  triggerManualCheck,
  startLiquidationMonitoring,
  stopLiquidationMonitoring 
} from '../services/liquidationService.js';

const router = express.Router();

/**
 * Get liquidation service status
 */
router.get('/status', (req, res) => {
  try {
    const status = getLiquidationStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting liquidation status:', error);
    res.status(500).json({ 
      error: 'Failed to get liquidation status',
      message: error.message 
    });
  }
});

/**
 * Trigger manual liquidation check (requires admin auth)
 */
router.post('/check', requireAdminAuth, async (req, res) => {
  try {
    console.log('Manual liquidation check triggered via API');
    await triggerManualCheck();
    res.json({ 
      success: true, 
      message: 'Manual liquidation check completed' 
    });
  } catch (error) {
    console.error('Error triggering manual check:', error);
    res.status(500).json({ 
      error: 'Failed to trigger manual check',
      message: error.message 
    });
  }
});

/**
 * Start liquidation monitoring (requires admin auth)
 */
router.post('/start', requireAdminAuth, (req, res) => {
  try {
    startLiquidationMonitoring();
    res.json({ 
      success: true, 
      message: 'Liquidation monitoring started' 
    });
  } catch (error) {
    console.error('Error starting liquidation monitoring:', error);
    res.status(500).json({ 
      error: 'Failed to start liquidation monitoring',
      message: error.message 
    });
  }
});

/**
 * Stop liquidation monitoring (requires admin auth)
 */
router.post('/stop', requireAdminAuth, (req, res) => {
  try {
    stopLiquidationMonitoring();
    res.json({ 
      success: true, 
      message: 'Liquidation monitoring stopped' 
    });
  } catch (error) {
    console.error('Error stopping liquidation monitoring:', error);
    res.status(500).json({ 
      error: 'Failed to stop liquidation monitoring',
      message: error.message 
    });
  }
});

// Simple admin authentication middleware
function requireAdminAuth(req, res, next) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return res.status(503).json({ 
      error: 'Admin operations disabled',
      message: 'ADMIN_TOKEN not configured' 
    });
  }
  
  const providedToken = req.headers.authorization?.replace('Bearer ', '');
  if (!providedToken || providedToken !== adminToken) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid admin token required' 
    });
  }
  
  next();
}

export default router;