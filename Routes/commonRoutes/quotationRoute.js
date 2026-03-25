import express from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import { apiLimiter, writeLimiter } from '../../middleware/rateLimiter.js';
import Quotation from '../../models/Quotation.js';
import paginationMiddleware from '../../middleware/pagination.js';

const quotationRoute = express.Router();

quotationRoute.use(apiLimiter);
quotationRoute.use(authenticateJWT);

quotationRoute.get('/quotations', paginationMiddleware, async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;
    const quotations = await Quotation.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Quotation.countDocuments();
    res.json({ message: 'Quotations fetched', data: quotations, pagination: { page, limit, total } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

quotationRoute.post('/quotations', writeLimiter, async (req, res) => {
  try {
    const quotation = new Quotation({ ...req.body, createdBy: req.user.userId });
    await quotation.save();
    res.status(201).json({ message: 'Quotation created', data: quotation });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

quotationRoute.get('/quotations/:id', async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
    res.json({ data: quotation });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

export default quotationRoute;
