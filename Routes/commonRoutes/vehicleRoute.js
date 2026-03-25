import express from 'express';
import { authenticateJWT, checkRole } from '../../middleware/auth.js';
import { apiLimiter, writeLimiter } from '../../middleware/rateLimiter.js';
import paginationMiddleware from '../../middleware/pagination.js';
import {
  createVehicle, getVehicles, getVehicle,
  updateVehicleStatus, getAvailableVehicles,
} from '../../Controller/vehicleControllers/vehicleController.js';

const vehicleRoute = express.Router();

vehicleRoute.use(apiLimiter);
vehicleRoute.use(authenticateJWT);

vehicleRoute.get('/vehicles/available', getAvailableVehicles);
vehicleRoute.get('/vehicles', paginationMiddleware, getVehicles);
vehicleRoute.post('/vehicles', writeLimiter, checkRole(['admin', 'teamLead']), createVehicle);
vehicleRoute.get('/vehicles/:id', getVehicle);
vehicleRoute.patch('/vehicles/:id/status', writeLimiter, checkRole(['admin', 'teamLead']), updateVehicleStatus);

export default vehicleRoute;
