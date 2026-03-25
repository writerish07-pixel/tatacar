import express from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import { authLimiter, apiLimiter } from '../../middleware/rateLimiter.js';
import loginController from '../../Controller/authController/loginController.js';
import verifyController from '../../Controller/authController/verifyController.js';
import refreshController from '../../Controller/authController/refreshController.js';
import signupController from '../../Controller/authController/signupController.js';

const authRoute = express.Router();
authRoute.post('/auth/signup', authLimiter, signupController);
authRoute.post('/auth/login', authLimiter, loginController);
authRoute.get('/auth/verify', apiLimiter, authenticateJWT, verifyController);
authRoute.post('/auth/refresh-token', authLimiter, refreshController);
export default authRoute;
