import express from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import { apiLimiter, writeLimiter } from '../../middleware/rateLimiter.js';
import paginationMiddleware from '../../middleware/pagination.js';
import {
  createLead, getLeads, getLead,
  updateLeadStatus, addActivity, updateFollowUp, getTodayFollowUps,
} from '../../Controller/leadControllers/leadController.js';

const leadRoute = express.Router();

leadRoute.use(apiLimiter);
leadRoute.use(authenticateJWT);

leadRoute.get('/leads/follow-ups/today', getTodayFollowUps);
leadRoute.get('/leads', paginationMiddleware, getLeads);
leadRoute.post('/leads', writeLimiter, createLead);
leadRoute.get('/leads/:id', getLead);
leadRoute.patch('/leads/:id/status', writeLimiter, updateLeadStatus);
leadRoute.post('/leads/:id/activities', writeLimiter, addActivity);
leadRoute.patch('/leads/:id/follow-up', writeLimiter, updateFollowUp);

export default leadRoute;
