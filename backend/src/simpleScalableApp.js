import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { createServer } from "http";

import { connectDB } from "./lib/db.js";
import { PerformanceMonitor } from "./lib/monitoring.js";

// Import security middleware
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

// Import routes
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import fileUploadRoutes from "./routes/fileUpload.route.js";
import friendRequestRoutes from "./routes/friendRequest.route.js";
import groupRoutes from "./routes/group.route.js";
import notificationRoutes from "./routes/notification.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

// Trust proxy for accurate IP addresses (important for load balancers)
app.set('trust proxy', 1);

// Apply security middleware in order
app.use(securityHeaders);
app.use(compressionMiddleware);
app.use(requestSizeLimiter);
app.use(securityLogger);
app.use(generalLimiter);
app.use(speedLimiter);

// Body parsing with enhanced limits
app.use(express.json({ 
  limit: "10mb",
  parameterLimit: 1000,
  verify: (req, res, buf) => {
    // Additional JSON payload size verification
    if (buf.length > 10 * 1024 * 1024) { // 10MB
      throw new Error('Payload too large');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: "10mb", parameterLimit: 1000 }));
app.use(cookieParser());

// Data sanitization middleware
app.use(sanitizeData);

// Enhanced CORS configuration for scalability
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // Check if we're in development mode (NODE_ENV not set or set to development)
    const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
    
    if (isDevelopment) {
      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origin);
      const isDevServer = /^https?:\/\/(localhost|127\.0\.0\.1):(3000|3001|5173|8080|8081)$/.test(origin);
      
      if (isLocalhost || isDevServer) {
        console.log(`✅ CORS allowing development origin: ${origin}`);
        return callback(null, true);
      }
    }
    
    // In production, use strict origin checking
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin} (NODE_ENV: ${process.env.NODE_ENV})`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Explicit preflight handler

// Initialize performance monitor
const performanceMonitor = new PerformanceMonitor();

// Apply specific rate limits to routes
app.use("/api/auth", authLimiter);
app.use("/api/messages", messageLimiter);

// Health check endpoint with detailed metrics
app.get("/api/health", async (req, res) => {
  try {
    const { getConnectionStatus } = await import('./lib/db.js');
    
    const metrics = performanceMonitor.getMetrics();
    const health = performanceMonitor.getHealthStatus();
    const dbStatus = getConnectionStatus();
    
    res.status(200).json({
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      health: health.status,
      checks: health.checks,
      issues: health.issues,
      database: dbStatus,
      performance: {
        memory: {
          used: Math.round(metrics.memory.used / 1024 / 1024),
          total: Math.round(metrics.memory.total / 1024 / 1024),
          percentage: Math.round((metrics.memory.used / metrics.memory.total) * 100)
        },
        requests: {
          total: metrics.requests.total,
          averageResponseTime: Math.round(metrics.requests.averageResponseTime)
        },
        cache: {
          hitRate: Math.round(metrics.cache.hitRate)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Health check failed",
      error: error.message
    });
  }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", fileUploadRoutes);
app.use("/api/friends", friendRequestRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/notifications", notificationRoutes);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Error tracking middleware
app.use((err, req, res, next) => {
  performanceMonitor.trackError(err);
  next(err);
});

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
  
  // Don't leak error details in production
  const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(isDevelopment && { stack: err.stack })
  });
});

// Create HTTP server
const server = createServer(app);

// Start server
const startServer = async () => {
  try {
    // Start listening
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`📊 Process ID: ${process.pid}`);
      console.log(`🔒 Security middleware enabled`);
    });
    
    // Connect to database
    await connectDB();
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`🔄 Received ${signal}, shutting down gracefully...`);
  
  // Stop accepting new connections
  server.close(async () => {
    console.log('🔒 HTTP server closed');
    
    try {
      // Close database connection
      const { disconnectDB } = await import('./lib/db.js');
      await disconnectDB();
      console.log('🔒 Database connection closed');
      
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error.message);
      process.exit(1);
    }
  });
  
  // Force close after timeout
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000); // 10 second timeout
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

export default app;
