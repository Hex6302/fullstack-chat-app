import Queue from 'bull';
import { redis } from './redis.js';
import { logSecurityEvent } from './utils.js';

// Queue configuration for scalability
const queueConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
  },
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50,      // Keep last 50 failed jobs
    attempts: 3,           // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
};

// Create queues for different types of processing
export const messageQueue = new Queue('message processing', queueConfig);
export const notificationQueue = new Queue('notifications', queueConfig);
export const fileProcessingQueue = new Queue('file processing', queueConfig);
export const emailQueue = new Queue('email sending', queueConfig);
export const analyticsQueue = new Queue('analytics', queueConfig);

// Message processing queue
messageQueue.process('sendMessage', async (job) => {
  const { messageData, senderId, receiverId, groupId } = job.data;
  
  try {
    console.log(`📨 Processing message from ${senderId}`);
    
    // Simulate message processing (in real app, this would save to DB, send push notifications, etc.)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Log successful processing
    logSecurityEvent('Message Processed', {
      messageId: messageData._id,
      senderId,
      receiverId,
      groupId,
      jobId: job.id
    });
    
    return { success: true, messageId: messageData._id };
  } catch (error) {
    console.error('Message processing error:', error.message);
    throw error;
  }
});

// Notification queue
notificationQueue.process('sendNotification', async (job) => {
  const { userId, type, data } = job.data;
  
  try {
    console.log(`🔔 Processing notification for user ${userId}`);
    
    // Simulate notification processing
    await new Promise(resolve => setTimeout(resolve, 50));
    
    logSecurityEvent('Notification Processed', {
      userId,
      type,
      jobId: job.id
    });
    
    return { success: true, userId, type };
  } catch (error) {
    console.error('Notification processing error:', error.message);
    throw error;
  }
});

// File processing queue
fileProcessingQueue.process('processFile', async (job) => {
  const { fileId, userId, fileType } = job.data;
  
  try {
    console.log(`📁 Processing file ${fileId} for user ${userId}`);
    
    // Simulate file processing (resize, optimize, scan for viruses, etc.)
    await new Promise(resolve => setTimeout(resolve, 200));
    
    logSecurityEvent('File Processed', {
      fileId,
      userId,
      fileType,
      jobId: job.id
    });
    
    return { success: true, fileId };
  } catch (error) {
    console.error('File processing error:', error.message);
    throw error;
  }
});

// Email queue
emailQueue.process('sendEmail', async (job) => {
  const { to, subject, template, data } = job.data;
  
  try {
    console.log(`📧 Processing email to ${to}`);
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 300));
    
    logSecurityEvent('Email Processed', {
      to,
      subject,
      jobId: job.id
    });
    
    return { success: true, to, subject };
  } catch (error) {
    console.error('Email processing error:', error.message);
    throw error;
  }
});

// Analytics queue
analyticsQueue.process('trackEvent', async (job) => {
  const { userId, event, data } = job.data;
  
  try {
    console.log(`📊 Processing analytics event: ${event}`);
    
    // Simulate analytics processing
    await new Promise(resolve => setTimeout(resolve, 25));
    
    logSecurityEvent('Analytics Processed', {
      userId,
      event,
      jobId: job.id
    });
    
    return { success: true, event };
  } catch (error) {
    console.error('Analytics processing error:', error.message);
    throw error;
  }
});

// Queue event handlers for monitoring
const setupQueueMonitoring = (queue, queueName) => {
  queue.on('completed', (job, result) => {
    console.log(`✅ ${queueName} job ${job.id} completed`);
  });

  queue.on('failed', (job, err) => {
    console.error(`❌ ${queueName} job ${job.id} failed:`, err.message);
    logSecurityEvent('Queue Job Failed', {
      queueName,
      jobId: job.id,
      error: err.message,
      data: job.data
    });
  });

  queue.on('stalled', (job) => {
    console.warn(`⚠️ ${queueName} job ${job.id} stalled`);
  });

  queue.on('progress', (job, progress) => {
    console.log(`📈 ${queueName} job ${job.id} progress: ${progress}%`);
  });
};

// Setup monitoring for all queues
setupQueueMonitoring(messageQueue, 'Message Queue');
setupQueueMonitoring(notificationQueue, 'Notification Queue');
setupQueueMonitoring(fileProcessingQueue, 'File Processing Queue');
setupQueueMonitoring(emailQueue, 'Email Queue');
setupQueueMonitoring(analyticsQueue, 'Analytics Queue');

// Queue management functions
export class QueueManager {
  constructor() {
    this.queues = {
      message: messageQueue,
      notification: notificationQueue,
      fileProcessing: fileProcessingQueue,
      email: emailQueue,
      analytics: analyticsQueue
    };
  }

  // Add job to queue
  async addJob(queueName, jobType, data, options = {}) {
    try {
      const queue = this.queues[queueName];
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await queue.add(jobType, data, {
        ...queueConfig.defaultJobOptions,
        ...options
      });

      console.log(`📝 Added job ${job.id} to ${queueName} queue`);
      return job;
    } catch (error) {
      console.error(`Error adding job to ${queueName}:`, error.message);
      throw error;
    }
  }

  // Get queue statistics
  async getQueueStats(queueName) {
    try {
      const queue = this.queues[queueName];
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      };
    } catch (error) {
      console.error(`Error getting stats for ${queueName}:`, error.message);
      return null;
    }
  }

  // Get all queue statistics
  async getAllQueueStats() {
    const stats = {};
    for (const queueName of Object.keys(this.queues)) {
      stats[queueName] = await this.getQueueStats(queueName);
    }
    return stats;
  }

  // Pause queue
  async pauseQueue(queueName) {
    try {
      const queue = this.queues[queueName];
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      await queue.pause();
      console.log(`⏸️ Paused ${queueName} queue`);
    } catch (error) {
      console.error(`Error pausing ${queueName}:`, error.message);
      throw error;
    }
  }

  // Resume queue
  async resumeQueue(queueName) {
    try {
      const queue = this.queues[queueName];
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      await queue.resume();
      console.log(`▶️ Resumed ${queueName} queue`);
    } catch (error) {
      console.error(`Error resuming ${queueName}:`, error.message);
      throw error;
    }
  }

  // Clean queue (remove old jobs)
  async cleanQueue(queueName, grace = 5000) {
    try {
      const queue = this.queues[queueName];
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      await queue.clean(grace, 'completed');
      await queue.clean(grace, 'failed');
      console.log(`🧹 Cleaned ${queueName} queue`);
    } catch (error) {
      console.error(`Error cleaning ${queueName}:`, error.message);
      throw error;
    }
  }

  // Close all queues
  async closeAllQueues() {
    console.log('🔄 Closing all queues...');
    
    for (const [queueName, queue] of Object.entries(this.queues)) {
      try {
        await queue.close();
        console.log(`✅ Closed ${queueName} queue`);
      } catch (error) {
        console.error(`❌ Error closing ${queueName}:`, error.message);
      }
    }
  }
}

// Export queue manager instance
export const queueManager = new QueueManager();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Queue system shutting down...');
  await queueManager.closeAllQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Queue system shutting down...');
  await queueManager.closeAllQueues();
  process.exit(0);
});

// Export individual queue functions for convenience
export const addMessageJob = (data, options) => queueManager.addJob('message', 'sendMessage', data, options);
export const addNotificationJob = (data, options) => queueManager.addJob('notification', 'sendNotification', data, options);
export const addFileProcessingJob = (data, options) => queueManager.addJob('fileProcessing', 'processFile', data, options);
export const addEmailJob = (data, options) => queueManager.addJob('email', 'sendEmail', data, options);
export const addAnalyticsJob = (data, options) => queueManager.addJob('analytics', 'trackEvent', data, options);












