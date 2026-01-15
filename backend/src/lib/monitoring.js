import { performance } from 'perf_hooks';
import { getPerformanceMetrics } from './db.js';
import { redis } from './redis.js';
import { logSecurityEvent } from './utils.js';

// Performance monitoring and metrics collection
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimes: []
      },
      database: {
        queries: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        connectionPool: {
          active: 0,
          idle: 0,
          total: 0
        }
      },
      memory: {
        used: 0,
        total: 0,
        external: 0,
        heapUsed: 0,
        heapTotal: 0
      },
      cpu: {
        usage: 0,
        loadAverage: []
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      },
      errors: {
        total: 0,
        byType: {},
        recent: []
      },
      uptime: {
        startTime: Date.now(),
        current: 0
      }
    };

    this.startMonitoring();
  }

  // Start monitoring processes
  startMonitoring() {
    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30000);

    // Log metrics every 5 minutes
    setInterval(() => {
      this.logMetrics();
    }, 300000);

    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000);
  }

  // Update system metrics
  async updateSystemMetrics() {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      this.metrics.memory = {
        used: memUsage.rss,
        total: memUsage.rss + memUsage.external,
        external: memUsage.external,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal
      };

      // CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      this.metrics.cpu.usage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

      // Load average
      const os = await import('os');
      this.metrics.cpu.loadAverage = os.loadavg();

      // Uptime
      this.metrics.uptime.current = Date.now() - this.metrics.uptime.startTime;

      // Database metrics
      try {
        const dbMetrics = await getPerformanceMetrics();
        if (dbMetrics) {
          this.metrics.database.connectionPool = {
            active: dbMetrics.connections?.current || 0,
            idle: dbMetrics.connections?.available || 0,
            total: dbMetrics.connections?.totalCreated || 0
          };
        }
      } catch (error) {
        console.error('Error getting database metrics:', error.message);
      }

      // Cache metrics
      try {
        if (process.env.REDIS_HOST) {
          const info = await redis.info('stats');
          const lines = info.split('\r\n');
          const stats = {};
          
          lines.forEach(line => {
            if (line.includes(':')) {
              const [key, value] = line.split(':');
              stats[key] = value;
            }
          });

          this.metrics.cache.hits = parseInt(stats.keyspace_hits) || 0;
          this.metrics.cache.misses = parseInt(stats.keyspace_misses) || 0;
          
          const total = this.metrics.cache.hits + this.metrics.cache.misses;
          this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
        }
      } catch (error) {
        console.error('Error getting cache metrics:', error.message);
      }

    } catch (error) {
      console.error('Error updating system metrics:', error.message);
    }
  }

  // Track request metrics
  trackRequest(method, url, statusCode, responseTime) {
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Track response times (keep last 100)
    this.metrics.requests.responseTimes.push(responseTime);
    if (this.metrics.requests.responseTimes.length > 100) {
      this.metrics.requests.responseTimes.shift();
    }

    // Calculate average response time
    const total = this.metrics.requests.responseTimes.reduce((sum, time) => sum + time, 0);
    this.metrics.requests.averageResponseTime = total / this.metrics.requests.responseTimes.length;

    // Log slow requests
    if (responseTime > 5000) { // 5 seconds
      logSecurityEvent('Slow Request Detected', {
        method,
        url,
        statusCode,
        responseTime,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Track database query metrics
  trackDatabaseQuery(queryTime, queryType = 'unknown') {
    this.metrics.database.queries++;
    
    // Track slow queries
    if (queryTime > 1000) { // 1 second
      this.metrics.database.slowQueries++;
      
      logSecurityEvent('Slow Database Query', {
        queryType,
        queryTime,
        timestamp: new Date().toISOString()
      });
    }

    // Update average query time
    const totalQueries = this.metrics.database.queries;
    this.metrics.database.averageQueryTime = 
      (this.metrics.database.averageQueryTime * (totalQueries - 1) + queryTime) / totalQueries;
  }

  // Track errors
  trackError(error, context = {}) {
    this.metrics.errors.total++;
    
    const errorType = error.name || 'UnknownError';
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;
    
    // Keep last 50 errors
    this.metrics.errors.recent.push({
      type: errorType,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
    
    if (this.metrics.errors.recent.length > 50) {
      this.metrics.errors.recent.shift();
    }

    logSecurityEvent('Application Error', {
      errorType,
      message: error.message,
      context,
      timestamp: new Date().toISOString()
    });
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString()
    };
  }

  // Get health status
  getHealthStatus() {
    const health = {
      status: 'healthy',
      checks: {
        memory: 'healthy',
        database: 'healthy',
        cache: 'healthy',
        errors: 'healthy'
      },
      issues: []
    };

    // Check memory usage
    const memoryUsagePercent = (this.metrics.memory.used / this.metrics.memory.total) * 100;
    if (memoryUsagePercent > 90) {
      health.checks.memory = 'critical';
      health.issues.push('High memory usage');
    } else if (memoryUsagePercent > 80) {
      health.checks.memory = 'warning';
      health.issues.push('Elevated memory usage');
    }

    // Check database connection pool
    if (this.metrics.database.connectionPool.active > this.metrics.database.connectionPool.total * 0.9) {
      health.checks.database = 'warning';
      health.issues.push('High database connection usage');
    }

    // Check cache hit rate
    if (this.metrics.cache.hitRate < 70 && this.metrics.cache.hits > 0) {
      health.checks.cache = 'warning';
      health.issues.push('Low cache hit rate');
    }

    // Check error rate
    const errorRate = this.metrics.errors.total / Math.max(this.metrics.requests.total, 1) * 100;
    if (errorRate > 10) {
      health.checks.errors = 'critical';
      health.issues.push('High error rate');
    } else if (errorRate > 5) {
      health.checks.errors = 'warning';
      health.issues.push('Elevated error rate');
    }

    // Overall status
    if (Object.values(health.checks).includes('critical')) {
      health.status = 'critical';
    } else if (Object.values(health.checks).includes('warning')) {
      health.status = 'warning';
    }

    return health;
  }

  // Log metrics
  logMetrics() {
    const metrics = this.getMetrics();
    const health = this.getHealthStatus();
    
    console.log('📊 Performance Metrics:');
    console.log(`  Status: ${health.status}`);
    console.log(`  Requests: ${metrics.requests.total} (${metrics.requests.successful} successful, ${metrics.requests.failed} failed)`);
    console.log(`  Avg Response Time: ${metrics.requests.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Database Queries: ${metrics.database.queries} (${metrics.database.slowQueries} slow)`);
    console.log(`  Memory Usage: ${(metrics.memory.used / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Cache Hit Rate: ${metrics.cache.hitRate.toFixed(2)}%`);
    console.log(`  Errors: ${metrics.errors.total}`);
    
    if (health.issues.length > 0) {
      console.log(`  Issues: ${health.issues.join(', ')}`);
    }
  }

  // Clean up old data
  cleanupOldData() {
    // Keep only recent errors (last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.metrics.errors.recent = this.metrics.errors.recent.filter(
      error => new Date(error.timestamp).getTime() > oneDayAgo
    );

    // Reset counters periodically
    if (this.metrics.requests.total > 1000000) {
      this.metrics.requests.total = Math.floor(this.metrics.requests.total * 0.9);
      this.metrics.requests.successful = Math.floor(this.metrics.requests.successful * 0.9);
      this.metrics.requests.failed = Math.floor(this.metrics.requests.failed * 0.9);
    }
  }

  // Performance timing helper
  startTimer(label) {
    performance.mark(`${label}-start`);
  }

  endTimer(label) {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const measure = performance.getEntriesByName(label)[0];
    performance.clearMarks(`${label}-start`);
    performance.clearMarks(`${label}-end`);
    performance.clearMeasures(label);
    
    return measure.duration;
  }
}

// Create global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Middleware for Express to track requests
export const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    performanceMonitor.trackRequest(req.method, req.url, res.statusCode, responseTime);
  });
  
  next();
};

// Database query timing middleware
export const databaseTimingMiddleware = (queryTime, queryType) => {
  performanceMonitor.trackDatabaseQuery(queryTime, queryType);
};

// Error tracking middleware
export const errorTrackingMiddleware = (error, req, res, next) => {
  performanceMonitor.trackError(error, {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  next(error);
};

// Export performance utilities
export const startTimer = (label) => performanceMonitor.startTimer(label);
export const endTimer = (label) => performanceMonitor.endTimer(label);
export const getMetrics = () => performanceMonitor.getMetrics();
export const getHealthStatus = () => performanceMonitor.getHealthStatus();












