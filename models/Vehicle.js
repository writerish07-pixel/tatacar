import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  vin: { type: String, unique: true, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  variant: { type: String, required: true, trim: true },
  colour: { type: String, trim: true },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'electric', 'cng', 'hybrid'],
    default: 'petrol',
  },
  year: { type: Number },
  exShowroomPrice: { type: Number, default: 0 },
  yardLocation: { type: String, trim: true },
  status: {
    type: String,
    enum: ['in_yard', 'allocated', 'delivered', 'in_transit', 'demo'],
    default: 'in_yard',
  },
  allocatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
export default Vehicle;
