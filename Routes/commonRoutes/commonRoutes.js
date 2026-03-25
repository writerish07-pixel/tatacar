import express from 'express'
import { authenticateJWT, checkRole } from '../../middleware/auth.js'
import stockSheetRoute from './stockSheets.js';
import schemeSheetRoute from './schemeSheet.js';
import quotationRoute from './quotationRoute.js';
import pdfRoute from './pdfRoute.js';
import bookingRoute from './bookingRoute.js'
import authRoute from './authRoute.js'
import leadRoute from './leadRoute.js';
import vehicleRoute from './vehicleRoute.js';
import testDriveRoute from './testDriveRoute.js';

const commonRoute = express.Router();
commonRoute.use(authRoute);
commonRoute.use(stockSheetRoute);
commonRoute.use(schemeSheetRoute);
commonRoute.use(quotationRoute);
commonRoute.use(pdfRoute);
commonRoute.use(bookingRoute);
commonRoute.use(leadRoute);
commonRoute.use(vehicleRoute);
commonRoute.use(testDriveRoute);
export default commonRoute;
