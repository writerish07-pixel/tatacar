import express from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';

const stockSheetRoute = express.Router();

stockSheetRoute.use(apiLimiter);
stockSheetRoute.use(authenticateJWT);

stockSheetRoute.get('/stock', apiLimiter, async (req, res) => {
  try {
    res.json({ message: 'Stock data endpoint', data: [] });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

export default stockSheetRoute;
