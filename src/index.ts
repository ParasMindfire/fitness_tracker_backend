// Importing required modules and packages
import express, { Express } from 'express';
import router from './routes/index';
import sequelize from './db/index';
import syncTables from './models/SyncModels';
import cors from "cors";
import swaggerDocs from './services/SwaggerConfig';
import dotenv from "dotenv";
import { ErrorHandler } from './middlewares/ErrorHandler';
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Create an Express application
const app: Express = express();

// Set the port number from environment variables
const port = process.env.PORT || 3000; // Default to 5000 if PORT is not defined

// Security Middleware
app.use(helmet()); // Secure HTTP headers
app.use(cors({ origin: '*' })); // Enable CORS

// Rate Limiting (Prevents brute-force attacks)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

// Middleware to parse incoming JSON requests
app.use(express.json());

// Initialize Swagger API documentation
swaggerDocs(app);

// Use the main router to manage different endpoints
app.use('/', router);

// Global error-handling middleware (must be after routes for proper handling)
app.use(ErrorHandler);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Start the Express server and listen on the defined port
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Function to establish a database connection and synchronize tables
const db = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    await syncTables();
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

// Initialize database connection
db();

export default app;
