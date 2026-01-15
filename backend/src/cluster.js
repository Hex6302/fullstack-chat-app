import cluster from 'cluster';
import os from 'os';
import { createServer } from 'http';
import app from './app.js';
import { connectDB, disconnectDB } from './lib/db.js';
import { redis } from './lib/redis.js';

// Cluster configuration for horizontal scaling
const numCPUs = os.cpus().length;
const maxWorkers = parseInt(process.env.MAX_WORKERS) || Math.min(numCPUs, 8);
const minWorkers = parseInt(process.env.MIN_WORKERS) || 2;

// Master process - manages worker processes
if (cluster.isMaster) {
  console.log(`🚀 Master process ${process.pid} is running`);
  console.log(`💻 CPU cores available: ${numCPUs}`);
  console.log(`👥 Starting ${maxWorkers} worker processes`);

  // Fork workers
  for (let i = 0; i < maxWorkers; i++) {
    cluster.fork();
  }

  // Handle worker events
  cluster.on('exit', (worker, code, signal) => {
    console.log(`❌ Worker ${worker.process.pid} died`);
    
    // Restart worker if it's not an intentional shutdown
    if (signal !== 'SIGTERM' && signal !== 'SIGINT') {
      console.log(`🔄 Starting a new worker...`);
      cluster.fork();
    }
  });

  cluster.on('online', (worker) => {
    console.log(`✅ Worker ${worker.process.pid} is online`);
  });

  cluster.on('listening', (worker, address) => {
    console.log(`🔊 Worker ${worker.process.pid} is listening on ${address.address}:${address.port}`);
  });

  // Graceful shutdown for master process
  process.on('SIGTERM', () => {
    console.log('🔄 Master process received SIGTERM, shutting down workers...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });

  process.on('SIGINT', () => {
    console.log('🔄 Master process received SIGINT, shutting down workers...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });

} else {
  // Worker process - handles actual requests
  const PORT = process.env.PORT || 5001;
  const server = createServer(app);

  // Enhanced server configuration for scalability
  server.maxConnections = parseInt(process.env.MAX_CONNECTIONS) || 1000;
  
  // Keep-alive settings for better performance
  server.keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 65000;
  server.headersTimeout = parseInt(process.env.HEADERS_TIMEOUT) || 66000;

  // Start server
  const startServer = async () => {
    try {
      // Connect to database
      await connectDB();
      
      // Test Redis connection
      if (process.env.REDIS_HOST) {
        try {
          await redis.ping();
          console.log('🔗 Redis connected successfully');
        } catch (error) {
          console.warn('⚠️ Redis connection failed, continuing without Redis:', error.message);
        }
      }

      // Start listening
      server.listen(PORT, () => {
        console.log(`🚀 Worker ${process.pid} listening on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📊 Max connections: ${server.maxConnections}`);
      });

      // Handle server errors
      server.on('error', (error) => {
        if (error.syscall !== 'listen') {
          throw error;
        }

        const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

        switch (error.code) {
          case 'EACCES':
            console.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
          case 'EADDRINUSE':
            console.error(`${bind} is already in use`);
            process.exit(1);
            break;
          default:
            throw error;
        }
      });

      // Graceful shutdown for worker process
      const gracefulShutdown = async (signal) => {
        console.log(`🔄 Worker ${process.pid} received ${signal}, shutting down gracefully...`);
        
        // Stop accepting new connections
        server.close(async () => {
          console.log(`🔒 Worker ${process.pid} HTTP server closed`);
          
          try {
            // Close database connection
            await disconnectDB();
            console.log(`🔒 Worker ${process.pid} database connection closed`);
            
            // Close Redis connections
            if (process.env.REDIS_HOST) {
              await redis.quit();
              console.log(`🔒 Worker ${process.pid} Redis connection closed`);
            }
            
            console.log(`✅ Worker ${process.pid} shutdown complete`);
            process.exit(0);
          } catch (error) {
            console.error(`❌ Error during worker ${process.pid} shutdown:`, error.message);
            process.exit(1);
          }
        });

        // Force close after timeout
        setTimeout(() => {
          console.error(`❌ Worker ${process.pid} forced shutdown after timeout`);
          process.exit(1);
        }, 10000); // 10 second timeout
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        console.error(`❌ Worker ${process.pid} uncaught exception:`, error);
        gracefulShutdown('uncaughtException');
      });

      process.on('unhandledRejection', (reason, promise) => {
        console.error(`❌ Worker ${process.pid} unhandled rejection at:`, promise, 'reason:', reason);
        gracefulShutdown('unhandledRejection');
      });

    } catch (error) {
      console.error(`❌ Worker ${process.pid} failed to start:`, error.message);
      process.exit(1);
    }
  };

  // Start the server
  startServer();
}

// Export for testing
export default cluster;












