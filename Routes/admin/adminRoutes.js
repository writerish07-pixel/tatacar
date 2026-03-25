import express from 'express';
import { authenticateJWT, checkRole } from '../../middleware/auth.js'
import { apiLimiter } from '../../middleware/rateLimiter.js';
import allQuotationController from '../../Controller/adminControllers/allQuotationController.js';
import userInfoController from '../../Controller/adminControllers/userInfoController.js';
import bookingPageController from '../../Controller/adminControllers/bookingPageController.js';
import paginationMiddleware from '../../middleware/pagination.js';

const adminRoute = express.Router();
adminRoute.use(apiLimiter);
adminRoute.use(authenticateJWT);
adminRoute.use(checkRole(['admin']));
adminRoute.get('/all-quotations', paginationMiddleware, allQuotationController);
adminRoute.get('/user-info', userInfoController);
adminRoute.get('/all-bookings', bookingPageController);
export default adminRoute;
