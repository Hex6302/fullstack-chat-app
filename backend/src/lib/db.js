import mongoose from "mongoose";
import { logSecurityEvent } from "./utils.js";

// Enhanced database configuration for scalability
const dbConfig = {
  // Connection options
  maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10, // Maximum number of connections
  minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 2,  // Minimum number of connections
  maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME) || 30000, // Close connections after 30 seconds of inactivity
  serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 5000, // How long to try to connect
  socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 45000, // How long to wait for a response
  connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000, // How long to wait for initial connection
  
  // Retry settings
  retryWrites: true,
  retryReads: true,
  
  // Monitoring
  monitorCommands: process.env.NODE_ENV === 'development',
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('🔗 MongoDB connected successfully');
  console.log(`📊 Connection pool size: ${dbConfig.maxPoolSize}`);
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB connection error:', error.message);
  logSecurityEvent('Database Connection Error', {
    error: error.message,
    code: error.code,
    name: error.name
  });
});

mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected');
});

mongoose.connection.on('close', () => {
  console.log('🔒 MongoDB connection closed');
});

// Performance monitoring
if (process.env.NODE_ENV === 'development') {
  mongoose.connection.on('commandStarted', (event) => {
    console.log(`📝 DB Command Started: ${event.commandName}`);
  });
  
  mongoose.connection.on('commandSucceeded', (event) => {
    console.log(`✅ DB Command Succeeded: ${event.commandName} (${event.duration}ms)`);
  });
  
  mongoose.connection.on('commandFailed', (event) => {
    console.log(`❌ DB Command Failed: ${event.commandName} - ${event.failure}`);
  });
}

// Connection function with retry logic
export const connectDB = async (retries = 5, delay = 1000) => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    console.log('🔄 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, dbConfig);
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${conn.connection.db.databaseName}`);
    console.log(`🔗 Host: ${conn.connection.host}:${conn.connection.port}`);
    
    // Set up connection monitoring
    setupConnectionMonitoring();
    
    return conn.connection;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    if (retries > 0) {
      console.log(`🔄 Retrying connection in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectDB(retries - 1, delay * 2); // Exponential backoff
    }
    
    logSecurityEvent('Database Connection Failed', {
      error: error.message,
      retries: retries,
      uri: process.env.MONGODB_URI ? 'defined' : 'undefined'
    });
    
    throw error;
  }
};

// Connection monitoring and health checks
const setupConnectionMonitoring = () => {
  // Health check interval
  setInterval(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        // Ping the database to check connection health
        await mongoose.connection.db.admin().ping();
      }
    } catch (error) {
      console.error('❌ Database health check failed:', error.message);
      logSecurityEvent('Database Health Check Failed', {
        error: error.message,
        readyState: mongoose.connection.readyState
      });
    }
  }, 30000); // Check every 30 seconds
};

// Graceful shutdown
export const disconnectDB = async () => {
  try {
    console.log('🔄 Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message);
  }
};

// Connection status checker
export const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return {
    state: states[mongoose.connection.readyState],
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
    poolSize: mongoose.connection.db?.serverConfig?.poolSize || 'unknown'
  };
};

// Database performance metrics
export const getPerformanceMetrics = async () => {
  try {
    const admin = mongoose.connection.db.admin();
    const serverStatus = await admin.serverStatus();
    
    return {
      uptime: serverStatus.uptime,
      connections: serverStatus.connections,
      memory: serverStatus.mem,
      operations: serverStatus.opcounters,
      network: serverStatus.network,
      locks: serverStatus.locks
    };
  } catch (error) {
    console.error('Error getting performance metrics:', error.message);
    return null;
  }
};

// Index optimization helper
export const optimizeIndexes = async () => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      const coll = mongoose.connection.db.collection(collection.name);
      const indexes = await coll.indexes();
      
      console.log(`📊 Collection: ${collection.name}`);
      console.log(`📈 Indexes: ${indexes.length}`);
      
      // Log index details
      indexes.forEach(index => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      });
    }
  } catch (error) {
    console.error('Error optimizing indexes:', error.message);
  }
};

// Query optimization middleware
export const queryOptimization = (schema) => {
  // Add query optimization middleware
  schema.pre('find', function() {
    // Add query hints for better performance
    this.hint({});
  });
  
  schema.pre('findOne', function() {
    this.hint({});
  });
  
  schema.pre('aggregate', function() {
    // Add aggregation optimization
    this.allowDiskUse(true);
  });
};

// Export connection instance for advanced usage
export { mongoose };
