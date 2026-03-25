import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Token from '../models/Token.js';
import crypto from 'crypto';

const ACCESS_TOKEN_EXPIRY = 1 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000;

const generateUniqueToken = () => crypto.randomBytes(32).toString('hex');

export const authenticateUser = async (userId, password) => {
  try {
    const user = await User.findOne({ userId: userId.trim() });
    if (!user) return null;
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return null;
    return user;
  } catch (error) { return null; }
};

export const generateTokens = async (user) => {
  await Token.deleteMany({ userId: user.id });
  try {
    const accessToken = generateUniqueToken();
    const refreshToken = generateUniqueToken();
    const accessTokenExpires = new Date(Date.now() + ACCESS_TOKEN_EXPIRY);
    const refreshTokenExpires = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);
    const tokenDoc = new Token({ userId: user._id, accessToken, refreshToken, accessTokenExpires, refreshTokenExpires });
    await tokenDoc.save();
    return { accessToken, refreshToken, accessTokenExpires, refreshTokenExpires };
  } catch (error) { throw error; }
};

export const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const tokenDoc = await Token.findOne({ accessToken: token, accessTokenExpires: { $gt: new Date() } });
    if (!tokenDoc) return res.status(403).json({ message: 'Invalid or expired token' });
    const user = await User.findById(tokenDoc.userId);
    if (!user) return res.status(403).json({ message: 'User not found' });
    req.user = { userId: user._id, username: user.username, role: user.role };
    next();
  } catch (error) { res.status(500).json({ message: 'Internal server error', error: error.message }); }
};

export const verifyRefreshToken = async (token) => {
  try {
    const tokenDoc = await Token.findOne({ refreshToken: token, refreshTokenExpires: { $gt: new Date() } });
    if (!tokenDoc) throw new Error('Invalid or expired refresh token');
    return tokenDoc;
  } catch (error) { throw new Error('Invalid refresh token'); }
};

export const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied. Insufficient permissions.', requiredRole: roles, currentRole: req.user.role });
    next();
  };
};
