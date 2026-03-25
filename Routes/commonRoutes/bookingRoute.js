import express from 'express';
import { authenticateJWT, checkRole } from '../../middleware/auth.js';
import { apiLimiter, writeLimiter } from '../../middleware/rateLimiter.js';
import Booking from '../../models/Booking.js';
import paginationMiddleware from '../../middleware/pagination.js';

const bookingRoute = express.Router();

bookingRoute.use(apiLimiter);
bookingRoute.use(authenticateJWT);
bookingRoute.use(checkRole(['admin', 'teamLead', 'sales']));

bookingRoute.get('/bookings', paginationMiddleware, async (req, res) => {
  try {
    const { page, limit, skip } = req.pagination;
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Booking.countDocuments();
    res.json({ message: 'Bookings fetched', data: bookings, pagination: { page, limit, total } });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

bookingRoute.post('/bookings', writeLimiter, async (req, res) => {
  try {
    const booking = new Booking({ ...req.body, createdBy: req.user.userId });
    await booking.save();
    res.status(201).json({ message: 'Booking created', data: booking });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

bookingRoute.get('/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ data: booking });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

bookingRoute.patch('/bookings/:id/status', writeLimiter, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Booking updated', data: booking });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

export default bookingRoute;
