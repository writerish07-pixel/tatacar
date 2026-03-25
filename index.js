import express from 'express'
import cors from 'cors'
import bodyParser from "body-parser";
import 'dotenv/config'
import connectDB from './config/db.js'

import corsOptions from './config/corsOptions.js';

import authRoute from './Routes/commonRoutes/authRoute.js'
import commonRoute from './Routes/commonRoutes/commonRoutes.js';
import adminRoute from './Routes/admin/adminRoutes.js';

const app = express();
const PORT = 8080;

// server health check
app.get("/stats", (req, res) => {
  res.send("server is live");
});

// Connect to MongoDB
connectDB();

app.use(cors(corsOptions))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use(authRoute);

app.use(commonRoute);
app.use('/admin',adminRoute);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});