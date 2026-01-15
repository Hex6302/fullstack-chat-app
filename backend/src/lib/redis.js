import Redis from 'ioredis';
import { logSecurityEvent } from './utils.js';

// Redis configuration for scalability
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  // Connection pool settings
  family: 4,
  maxLoadingTimeout: 5000,
  enableReadyCheck: true,
  maxMemoryPolicy: 'allkeys-lru',
  // Cluster support
  enableOfflineQueue: false,
  // Performance optimizations
  enableAutoPipelining: true,
  maxPipelineSize: 1000,
};

// Only create Redis instances if Redis is configured
let redis, redisSubscriber, redisPublisher;

if (process.env.REDIS_HOST) {
  try {
    redis = new Redis(redisConfig);
    redisSubscriber = new Redis(redisConfig);
    redisPublisher = new Redis(redisConfig);
    
    // Redis event handlers
    redis.on('connect', () => {
      console.log('🔗 Redis connected successfully');
    });

    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error.message);
      logSecurityEvent('Redis Connection Error', {
        error: error.message,
        host: redisConfig.host,
        port: redisConfig.port
      });
    });

    redis.on('close', () => {
      console.log('🔌 Redis connection closed');
    });

    redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  } catch (error) {
    console.warn('⚠️ Redis initialization failed:', error.message);
    redis = null;
    redisSubscriber = null;
    redisPublisher = null;
  }
} else {
  console.log('ℹ️ Redis not configured, running without Redis features');
  redis = null;
  redisSubscriber = null;
  redisPublisher = null;
}

// Cache service for scalability
export class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour default TTL
  }

  // Set cache with TTL
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serializedValue = JSON.stringify(value);
      await redis.setex(key, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error('Cache set error:', error.message);
      return false;
    }
  }

  // Get cache value
  async get(key) {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error.message);
      return null;
    }
  }

  // Delete cache
  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error.message);
      return false;
    }
  }

  // Get or set pattern (cache-aside)
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    try {
      let value = await this.get(key);
      if (value === null) {
        value = await fetchFunction();
        if (value !== null && value !== undefined) {
          await this.set(key, value, ttl);
        }
      }
      return value;
    } catch (error) {
      console.error('Cache getOrSet error:', error.message);
      return await fetchFunction();
    }
  }

  // Batch operations
  async mget(keys) {
    try {
      const values = await redis.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('Cache mget error:', error.message);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs, ttl = this.defaultTTL) {
    try {
      const pipeline = redis.pipeline();
      for (const [key, value] of keyValuePairs) {
        pipeline.setex(key, ttl, JSON.stringify(value));
      }
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error.message);
      return false;
    }
  }

  // Pattern-based operations
  async keys(pattern) {
    try {
      return await redis.keys(pattern);
    } catch (error) {
      console.error('Cache keys error:', error.message);
      return [];
    }
  }

  async delPattern(pattern) {
    try {
      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache delPattern error:', error.message);
      return 0;
    }
  }

  // Increment/decrement operations
  async incr(key, ttl = this.defaultTTL) {
    try {
      const result = await redis.incr(key);
      await redis.expire(key, ttl);
      return result;
    } catch (error) {
      console.error('Cache incr error:', error.message);
      return 0;
    }
  }

  async decr(key, ttl = this.defaultTTL) {
    try {
      const result = await redis.decr(key);
      await redis.expire(key, ttl);
      return result;
    } catch (error) {
      console.error('Cache decr error:', error.message);
      return 0;
    }
  }

  // Hash operations
  async hset(key, field, value, ttl = this.defaultTTL) {
    try {
      await redis.hset(key, field, JSON.stringify(value));
      await redis.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Cache hset error:', error.message);
      return false;
    }
  }

  async hget(key, field) {
    try {
      const value = await redis.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache hget error:', error.message);
      return null;
    }
  }

  async hgetall(key) {
    try {
      const hash = await redis.hgetall(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      console.error('Cache hgetall error:', error.message);
      return {};
    }
  }

  // Set operations
  async sadd(key, ...members) {
    try {
      return await redis.sadd(key, ...members);
    } catch (error) {
      console.error('Cache sadd error:', error.message);
      return 0;
    }
  }

  async smembers(key) {
    try {
      return await redis.smembers(key);
    } catch (error) {
      console.error('Cache smembers error:', error.message);
      return [];
    }
  }

  async srem(key, ...members) {
    try {
      return await redis.srem(key, ...members);
    } catch (error) {
      console.error('Cache srem error:', error.message);
      return 0;
    }
  }

  // List operations
  async lpush(key, ...values) {
    try {
      return await redis.lpush(key, ...values.map(v => JSON.stringify(v)));
    } catch (error) {
      console.error('Cache lpush error:', error.message);
      return 0;
    }
  }

  async rpop(key) {
    try {
      const value = await redis.rpop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache rpop error:', error.message);
      return null;
    }
  }

  async lrange(key, start, stop) {
    try {
      const values = await redis.lrange(key, start, stop);
      return values.map(value => JSON.parse(value));
    } catch (error) {
      console.error('Cache lrange error:', error.message);
      return [];
    }
  }
}

// Session management with Redis
export class SessionService {
  constructor() {
    this.cache = new CacheService();
    this.sessionTTL = 7 * 24 * 60 * 60; // 7 days
  }

  async createSession(userId, sessionData) {
    const sessionId = `session:${userId}:${Date.now()}`;
    const session = {
      userId,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      ...sessionData
    };
    
    await this.cache.set(sessionId, session, this.sessionTTL);
    await this.cache.sadd(`user_sessions:${userId}`, sessionId);
    
    return sessionId;
  }

  async getSession(sessionId) {
    const session = await this.cache.get(sessionId);
    if (session) {
      // Update last accessed time
      session.lastAccessed = new Date().toISOString();
      await this.cache.set(sessionId, session, this.sessionTTL);
    }
    return session;
  }

  async destroySession(sessionId) {
    const session = await this.cache.get(sessionId);
    if (session) {
      await this.cache.del(sessionId);
      await this.cache.srem(`user_sessions:${session.userId}`, sessionId);
    }
  }

  async destroyUserSessions(userId) {
    const sessionIds = await this.cache.smembers(`user_sessions:${userId}`);
    for (const sessionId of sessionIds) {
      await this.cache.del(sessionId);
    }
    await this.cache.del(`user_sessions:${userId}`);
  }

  async getUserSessions(userId) {
    const sessionIds = await this.cache.smembers(`user_sessions:${userId}`);
    const sessions = [];
    for (const sessionId of sessionIds) {
      const session = await this.cache.get(sessionId);
      if (session) {
        sessions.push({ sessionId, ...session });
      }
    }
    return sessions;
  }
}

// Rate limiting with Redis
export class RateLimitService {
  constructor() {
    this.cache = new CacheService();
  }

  async checkRateLimit(key, limit, window) {
    const current = await this.cache.incr(key, window);
    if (current === 1) {
      await this.cache.set(key, 1, window);
    }
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetTime: Date.now() + (window * 1000)
    };
  }

  async getRateLimitInfo(key) {
    const current = await this.cache.get(key) || 0;
    return {
      current,
      remaining: Math.max(0, 100 - current), // Assuming limit of 100
      resetTime: Date.now() + 3600000 // Assuming 1 hour window
    };
  }
}

// Message queue with Redis
export class MessageQueueService {
  constructor() {
    this.publisher = redisPublisher;
    this.subscriber = redisSubscriber;
  }

  async publishMessage(channel, message) {
    try {
      await this.publisher.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Message publish error:', error.message);
      return false;
    }
  }

  async subscribeToChannel(channel, callback) {
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          callback(JSON.parse(message));
        }
      });
      return true;
    } catch (error) {
      console.error('Message subscribe error:', error.message);
      return false;
    }
  }

  async unsubscribeFromChannel(channel) {
    try {
      await this.subscriber.unsubscribe(channel);
      return true;
    } catch (error) {
      console.error('Message unsubscribe error:', error.message);
      return false;
    }
  }
}

// Export instances
export { redis, redisSubscriber, redisPublisher };
export const cacheService = new CacheService();
export const sessionService = new SessionService();
export const rateLimitService = new RateLimitService();
export const messageQueueService = new MessageQueueService();

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (redis) {
    console.log('🔄 Closing Redis connections...');
    await redis.quit();
    await redisSubscriber.quit();
    await redisPublisher.quit();
    console.log('✅ Redis connections closed');
  }
});

process.on('SIGINT', async () => {
  if (redis) {
    console.log('🔄 Closing Redis connections...');
    await redis.quit();
    await redisSubscriber.quit();
    await redisPublisher.quit();
    console.log('✅ Redis connections closed');
  }
});
