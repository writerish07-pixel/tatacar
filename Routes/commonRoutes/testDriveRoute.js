import express from 'express';
import { authenticateJWT } from '../../middleware/auth.js';
import { apiLimiter, writeLimiter } from '../../middleware/rateLimiter.js';
import paginationMiddleware from '../../middleware/pagination.js';
import {
  scheduleTestDrive, getTestDrives, startTestDrive, completeTestDrive,
} from '../../Controller/testDriveControllers/testDriveController.js';

const testDriveRoute = express.Router();

testDriveRoute.use(apiLimiter);
testDriveRoute.use(authenticateJWT);

testDriveRoute.get('/test-drives', paginationMiddleware, getTestDrives);
testDriveRoute.post('/test-drives', writeLimiter, scheduleTestDrive);
testDriveRoute.patch('/test-drives/:id/start', writeLimiter, startTestDrive);
testDriveRoute.patch('/test-drives/:id/complete', writeLimiter, completeTestDrive);

export default testDriveRoute;
