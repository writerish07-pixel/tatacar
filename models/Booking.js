import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true, trim: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  customerName: { type: String, required: true, trim: true },
  customerMobile: { type: String, trim: true },
  customerEmail: { type: String, trim: true },
  vehicleDetails: {
    variant: { type: String, trim: true },
    color: { type: String, trim: true },
    fuel: { type: String, trim: true },
  },
  payment: {
    bookingAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    paymentMode: { type: String, enum: ['cash', 'cheque', 'online', 'loan'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'partial', 'completed'], default: 'pending' },
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'delivered'],
    default: 'pending',
  },
  salesPerson: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
