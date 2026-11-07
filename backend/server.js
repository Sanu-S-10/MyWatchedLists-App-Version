import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import watchItemRoutes from './routes/watchItemRoutes.js';
import customListRoutes from './routes/customListRoutes.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from root directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isMobileWebViewOrigin = (origin = '') => {
  return origin === 'http://localhost'
    || origin === 'https://localhost'
    || origin === 'capacitor://localhost'
    || origin === 'ionic://localhost';
};

const isPrivateNetworkOrigin = (origin = '') => {
  return /^https?:\/\/(?:127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(?::\d+)?$/i.test(origin);
};

const isAllowedConfiguredOrigin = (origin = '') => {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Allow local web development on any localhost port or private LAN IP
  return /^https?:\/\/localhost(?::\d+)?$/i.test(origin) || isPrivateNetworkOrigin(origin);
};

const corsOptions = {
  origin: (origin, callback) => {
    // Native mobile apps and curl do not set Origin header
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.length === 0) {
      // In local dev without explicitly set CORS_ORIGIN, permit localhost & private LAN
      if (isAllowedConfiguredOrigin(origin) || isMobileWebViewOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    }
    if (isAllowedConfiguredOrigin(origin) || isMobileWebViewOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts, please try again later.',
});

// Basic Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Import Routes
app.use('/api', apiLimiter);
app.use('/api/users', authLimiter, userRoutes);
app.use('/api/watch-history', watchItemRoutes);
app.use('/api/custom-lists', customListRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running on port ${PORT}`));
