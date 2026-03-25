import express from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';

const schemeSheetRoute = express.Router();

schemeSheetRoute.use(apiLimiter);
schemeSheetRoute.use(authenticateJWT);

schemeSheetRoute.get('/schemes', apiLimiter, async (req, res) => {
  try {
    res.json({ message: 'Scheme data endpoint', data: [] });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

export default schemeSheetRoute;
