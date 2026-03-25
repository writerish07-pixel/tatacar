import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_CONFIG = {
  expiresIn: {
    accessToken: '1d',
    refreshToken: '7d',
  },
  tokenTypes: {
    ACCESS: 'access',
    REFRESH: 'refresh',
  },
};

const generateToken = (userId, role, tokenType) => {
  const secret = tokenType === JWT_CONFIG.tokenTypes.ACCESS 
    ? process.env.JWT_ACCESS_SECRET 
    : process.env.JWT_REFRESH_SECRET;
  const expiresIn = tokenType === JWT_CONFIG.tokenTypes.ACCESS 
    ? JWT_CONFIG.expiresIn.accessToken 
    : JWT_CONFIG.expiresIn.refreshToken;
  return jwt.sign({ sub: userId, role, type: tokenType }, secret, { expiresIn });
};

const verifyToken = (token, tokenType) => {
  const secret = tokenType === JWT_CONFIG.tokenTypes.ACCESS 
    ? process.env.JWT_ACCESS_SECRET 
    : process.env.JWT_REFRESH_SECRET;
  try {
    return jwt.verify(token, secret);
  } catch (err) {
    throw new Error('Invalid token');
  }
};

const generateTokenPair = (userId, role) => {
  return {
    accessToken: generateToken(userId, role, JWT_CONFIG.tokenTypes.ACCESS),
    refreshToken: generateToken(userId, role, JWT_CONFIG.tokenTypes.REFRESH),
  };
};

export default { JWT_CONFIG, generateToken, verifyToken, generateTokenPair };
