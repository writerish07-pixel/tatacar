import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  type: { type: String, trim: true },
  note: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

const leadSchema = new mongoose.Schema({
  leadId: { type: String, unique: true, sparse: true, trim: true },
  customerName: { type: String, required: true, trim: true },
  customerMobile: { type: String, required: true, trim: true },
  customerEmail: { type: String, trim: true },
  source: {
    type: String,
    enum: ['walk_in', 'qr_walk_in', 'referral', 'online', 'phone', 'event', 'other'],
    default: 'walk_in',
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'interested', 'demo_scheduled', 'demo_done', 'negotiation', 'won', 'lost'],
    default: 'new',
  },
  interestedVariant: { type: String, trim: true },
  interestedColor: { type: String, trim: true },
  budget: { type: Number },
  lostReason: { type: String, trim: true },
  followUpDate: { type: Date },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  activities: [activitySchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Lead = mongoose.model('Lead', leadSchema);
export default Lead;
