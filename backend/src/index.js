import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import { connectDB } from "./lib/db.js";

// Security middleware imports
import {
  securityHeaders,
  sanitizeData,
  compressionMiddleware,
  generalLimiter,
  authLimiter,
  messageLimiter,
  speedLimiter,
  securityLogger,
  requestSizeLimiter
} from "./middleware/security.middleware.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import friendRequestRoutes from "./routes/friendRequest.route.js";
import groupRoutes from "./routes/group.route.js";
import { app, server } from "./lib/socket.js";
import { cleanupExpiredMessages } from "./lib/selfDestructCleanup.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// CORS must be FIRST before any other middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In production, use strict origin checking
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
    
    // Also allow localhost in development
    const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
    if (isDevelopment) {
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Security middleware (after CORS)
app.use(securityHeaders);
app.use(compressionMiddleware);
app.use(requestSizeLimiter);
app.use(securityLogger);

// Rate limiting
app.use(generalLimiter);
app.use(speedLimiter);

// Body parsing with limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Data sanitization (must be after body parsing)
app.use(sanitizeData);

app.use(cookieParser());

// Apply specific rate limits to routes
app.use("/api/auth", authLimiter);
app.use("/api/messages", messageLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/friends", friendRequestRoutes);
app.use("/api/groups", groupRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Only serve static files if frontend/dist exists (for combined deployments)
// Skip this when backend is deployed separately (e.g., on Render)
// Frontend is deployed on Vercel separately

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed'
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`🚀 Server is running on PORT: ${PORT}`);
  console.log(`🔒 Security middleware enabled`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  connectDB();
  
  // Start self-destruct cleanup job (runs every 30 seconds)
  setInterval(async () => {
    await cleanupExpiredMessages();
  }, 30000);
  
  console.log(`🗑️ Self-destruct cleanup job started (runs every 30 seconds)`);
});
