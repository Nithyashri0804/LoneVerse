import express from 'express';
import axios from 'axios';

const router = express.Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:3002';

router.post('/predict', async (req, res) => {
  try {
    const features = req.body;
    
    const response = await axios.post(`${ML_SERVICE_URL}/predict`, features, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    res.json({
      success: true,
      logisticRegression: response.data.prediction,
      model: 'logistic_regression'
    });
    
  } catch (error) {
    console.error('Error calling ML service:', error.message);
    
    res.status(500).json({
      error: 'ML prediction failed',
      message: error.message,
      fallback: 'Using heuristic method'
    });
  }
});

router.post('/predict/batch', async (req, res) => {
  try {
    const loans = req.body.loans || [];
    
    const response = await axios.post(`${ML_SERVICE_URL}/predict/batch`, { loans }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    res.json(response.data);
    
  } catch (error) {
    console.error('Error calling ML batch service:', error.message);
    
    res.status(500).json({
      error: 'ML batch prediction failed',
      message: error.message
    });
  }
});

router.get('/model/info', async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/model/info`, {
      timeout: 5000
    });
    
    res.json(response.data);
    
  } catch (error) {
    console.error('Error getting model info:', error.message);
    
    res.status(500).json({
      error: 'Failed to get model info',
      message: error.message
    });
  }
});

router.get('/model/metrics', async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/model/metrics`, {
      timeout: 5000
    });
    
    res.json(response.data);
    
  } catch (error) {
    console.error('Error getting model metrics:', error.message);
    
    res.status(500).json({
      error: 'Failed to get model metrics',
      message: error.message
    });
  }
});

router.get('/comparison', async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/comparison`, {
      timeout: 5000
    });
    
    res.json(response.data);
    
  } catch (error) {
    console.error('Error getting model comparison:', error.message);
    
    res.status(500).json({
      error: 'Failed to get model comparison',
      message: error.message
    });
  }
});

router.post('/data/record', async (req, res) => {
  try {
    const loanData = req.body;
    
    const response = await axios.post(`${ML_SERVICE_URL}/data/record`, loanData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    res.json(response.data);
    
  } catch (error) {
    console.error('Error recording loan data:', error.message);
    
    res.status(500).json({
      error: 'Failed to record loan data',
      message: error.message
    });
  }
});

router.post('/data/update', async (req, res) => {
  try {
    const updateData = req.body;
    
    const response = await axios.post(`${ML_SERVICE_URL}/data/update`, updateData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    
    res.json(response.data);
    
  } catch (error) {
    console.error('Error updating loan outcome:', error.message);
    
    res.status(500).json({
      error: 'Failed to update loan outcome',
      message: error.message
    });
  }
});

router.get('/data/statistics', async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/data/statistics`, {
      timeout: 5000
    });
    
    res.json(response.data);
    
  } catch (error) {
    console.error('Error getting data statistics:', error.message);
    
    res.status(500).json({
      error: 'Failed to get data statistics',
      message: error.message
    });
  }
});

router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, {
      timeout: 3000
    });
    
    res.json({
      mlService: response.data,
      integration: 'healthy'
    });
    
  } catch (error) {
    res.status(503).json({
      mlService: 'unhealthy',
      integration: 'degraded',
      error: error.message
    });
  }
});

export default router;
