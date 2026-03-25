import mongoose from 'mongoose';

const quotationSchema = new mongoose.Schema({
  quotationId: { type: String, unique: true, trim: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  customerId: { type: String, trim: true },
  customerName: { type: String, required: true, trim: true },
  customerMobile: { type: String, trim: true },
  salesPerson: { type: String, trim: true },
  vehicleDetails: {
    variant: { type: String, trim: true },
    color: { type: String, trim: true },
    fuel: { type: String, trim: true },
    year: { type: String, trim: true },
    HPN: { type: String, trim: true },
  },
  pricing: {
    exShowroomPrice: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    rtoType: { type: String, trim: true },
    rtoAmount: { type: Number, default: 0 },
    insuranceTotal: { type: Number, default: 0 },
    fasttag: { type: Number, default: 0 },
    tcs: { type: Number, default: 0 },
    ewType: { type: String, trim: true },
    ewAmount: { type: Number, default: 0 },
    accessoryTotal: { type: Number, default: 0 },
    vasType: { type: String, trim: true },
    vasAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
  },
  pdfUrl: { type: String, trim: true },
  status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'], default: 'draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Quotation = mongoose.model('Quotation', quotationSchema);
export default Quotation;
