import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accessToken: { type: String, required: true, unique: true },
  refreshToken: { type: String, required: true, unique: true },
  accessTokenExpires: { type: Date, required: true },
  refreshTokenExpires: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Token = mongoose.model('Token', tokenSchema);
export default Token;
