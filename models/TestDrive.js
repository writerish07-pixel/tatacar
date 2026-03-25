import mongoose from 'mongoose';

const testDriveSchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  customerName: { type: String, required: true, trim: true },
  customerMobile: { type: String, trim: true },
  scheduledAt: { type: Date, required: true },
  startedAt: { type: Date },
  completedAt: { type: Date },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled',
  },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comments: { type: String, trim: true },
    interested: { type: Boolean },
  },
  conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const TestDrive = mongoose.model('TestDrive', testDriveSchema);
export default TestDrive;
