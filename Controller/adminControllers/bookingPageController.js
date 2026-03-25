import Booking from '../../models/Booking.js';

const bookingPageController = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('createdBy', 'username userId role')
      .sort({ createdAt: -1 });
    res.json({ message: 'All bookings fetched', data: bookings });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export default bookingPageController;
