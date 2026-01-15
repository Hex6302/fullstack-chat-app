import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis, redisSubscriber, redisPublisher } from "./redis.js";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { logSecurityEvent } from "./utils.js";

// Enhanced Socket.IO configuration for horizontal scaling
export const createScalableSocketServer = async (server) => {
  const io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        // Check if we're in development mode (NODE_ENV not set or set to development)
        const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === "development";
        
        if (isDevelopment) {
          const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origin);
          const isDevServer = /^https?:\/\/(localhost|127\.0\.0\.1):(3000|3001|5173|8080|8081)$/.test(origin);
          
          if (isLocalhost || isDevServer) {
            console.log(`✅ Socket.IO allowing development origin: ${origin}`);
            return callback(null, true);
          }
        }
        
        // In production, use strict origin checking
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.log(`❌ Socket.IO blocked origin: ${origin} (NODE_ENV: ${process.env.NODE_ENV})`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ["GET", "POST"],
      credentials: true
    },
    allowEIO3: true,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    // Performance optimizations
    maxHttpBufferSize: 1e6, // 1MB
    allowUpgrades: true,
    perMessageDeflate: {
      threshold: 1024,
      concurrencyLimit: 10,
      memLevel: 7
    }
  });

  // Redis adapter for horizontal scaling
  if (process.env.REDIS_HOST) {
    try {
      // Test Redis connection first
      await redis.ping();
      io.adapter(createAdapter(redisPublisher, redisSubscriber));
      console.log('🔗 Socket.IO Redis adapter enabled for horizontal scaling');
    } catch (error) {
      console.warn('⚠️ Redis not available, Socket.IO will run in single-instance mode:', error.message);
    }
  }

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        logSecurityEvent('Socket Connection Rejected', {
          reason: 'No token provided',
          socketId: socket.id,
          ip: socket.handshake.address
        });
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (!decoded.userId) {
        logSecurityEvent('Socket Connection Rejected', {
          reason: 'Invalid token structure',
          socketId: socket.id,
          ip: socket.handshake.address
        });
        return next(new Error('Invalid token'));
      }

      // Verify user exists
      const user = await User.findById(decoded.userId).select("-password");
      if (!user) {
        logSecurityEvent('Socket Connection Rejected', {
          reason: 'User not found',
          userId: decoded.userId,
          socketId: socket.id,
          ip: socket.handshake.address
        });
        return next(new Error('User not found'));
      }

      // Attach user info to socket
      socket.userId = user._id.toString();
      socket.user = user;
      
      next();
    } catch (error) {
      logSecurityEvent('Socket Connection Rejected', {
        reason: 'Token verification failed',
        error: error.message,
        socketId: socket.id,
        ip: socket.handshake.address
      });
      next(new Error('Authentication failed'));
    }
  });

  return io;
};

// Enhanced Socket.IO event handlers for scalability
export const setupSocketHandlers = (io) => {
  // Store online users with Redis for multi-instance support
  const userSocketMap = new Map(); // {userId: socketId}
  const socketUserMap = new Map(); // {socketId: userId}
  const userLastSeen = new Map(); // {userId: timestamp}

  // Redis-based user presence management
  const updateUserPresence = async (userId, status) => {
    try {
      const presenceData = {
        userId,
        status,
        timestamp: Date.now(),
        serverId: process.env.SERVER_ID || 'default'
      };
      
      await redis.hset(`user_presence:${userId}`, presenceData);
      await redis.expire(`user_presence:${userId}`, 300); // 5 minutes TTL
      
      // Broadcast presence update to all connected clients
      io.emit('userPresenceUpdate', presenceData);
    } catch (error) {
      console.error('Error updating user presence:', error.message);
    }
  };

  // Get online users from Redis
  const getOnlineUsers = async () => {
    try {
      const keys = await redis.keys('user_presence:*');
      const onlineUsers = [];
      
      for (const key of keys) {
        const presence = await redis.hgetall(key);
        if (presence && presence.status === 'online') {
          onlineUsers.push(presence.userId);
        }
      }
      
      return onlineUsers;
    } catch (error) {
      console.error('Error getting online users:', error.message);
      return Array.from(userSocketMap.keys());
    }
  };

  // Socket connection handler
  io.on("connection", async (socket) => {
    const userId = socket.userId;
    const user = socket.user;
    
    console.log(`🔐 Authenticated user connected: ${user.fullName} (${userId})`);
    
    // Store user connection
    userSocketMap.set(userId, socket.id);
    socketUserMap.set(socket.id, userId);
    
    // Update last seen
    userLastSeen.set(userId, Date.now());
    
    // Update user presence in Redis
    await updateUserPresence(userId, 'online');
    
    // Join user to their personal room for direct messaging
    socket.join(`user_${userId}`);
    
    // Log successful connection
    logSecurityEvent('Socket Connection Success', {
      userId: userId,
      userName: user.fullName,
      socketId: socket.id,
      ip: socket.handshake.address
    });

    // Emit online users to all connected clients
    const onlineUsers = await getOnlineUsers();
    io.emit("getOnlineUsers", onlineUsers);

    // Handle disconnection
    socket.on("disconnect", async (reason) => {
      console.log(`🔐 User disconnected: ${user.fullName} (${userId}) - Reason: ${reason}`);
      
      // Clean up user data
      if (userId) {
        userSocketMap.delete(userId);
        socketUserMap.delete(socket.id);
        userLastSeen.set(userId, Date.now());
        
        // Update user presence in Redis
        await updateUserPresence(userId, 'offline');
        
        // Log disconnection
        logSecurityEvent('Socket Disconnection', {
          userId: userId,
          userName: user.fullName,
          socketId: socket.id,
          reason: reason
        });
      }
      
      // Update online users list
      const onlineUsers = await getOnlineUsers();
      io.emit("getOnlineUsers", onlineUsers);
    });

    // Enhanced typing status with validation
    socket.on("typing", async ({ receiverId, groupId, isTyping }) => {
      try {
        // Validate input
        if (typeof isTyping !== 'boolean') {
          return;
        }

        if (receiverId) {
          // Validate receiverId format
          if (typeof receiverId !== 'string' || receiverId.length !== 24) {
            return;
          }

          // Store typing status in Redis for multi-instance support
          const typingData = {
            senderId: userId,
            senderName: user.fullName,
            receiverId,
            isTyping,
            timestamp: Date.now()
          };

          if (isTyping) {
            await redis.setex(`typing:${receiverId}:${userId}`, 10, JSON.stringify(typingData));
          } else {
            await redis.del(`typing:${receiverId}:${userId}`);
          }

          // Emit to specific user
          io.to(`user_${receiverId}`).emit("typingStatus", {
            senderId: userId,
            senderName: user.fullName,
            isTyping
          });
        } else if (groupId) {
          // Validate groupId format
          if (typeof groupId !== 'string' || groupId.length !== 24) {
            return;
          }

          // Store group typing status in Redis
          const groupTypingData = {
            senderId: userId,
            senderName: user.fullName,
            groupId,
            isTyping,
            timestamp: Date.now()
          };

          if (isTyping) {
            await redis.setex(`group_typing:${groupId}:${userId}`, 10, JSON.stringify(groupTypingData));
          } else {
            await redis.del(`group_typing:${groupId}:${userId}`);
          }

          // Emit to group members except sender
          socket.to(`group_${groupId}`).emit("groupTypingStatus", {
            senderId: userId,
            senderName: user.fullName,
            groupId,
            isTyping
          });
        }
      } catch (error) {
        console.error('Error handling typing event:', error.message);
      }
    });

    // Enhanced stop typing with validation
    socket.on("stopTyping", async ({ receiverId, groupId }) => {
      try {
        if (receiverId) {
          // Validate receiverId format
          if (typeof receiverId !== 'string' || receiverId.length !== 24) {
            return;
          }

          // Remove typing status from Redis
          await redis.del(`typing:${receiverId}:${userId}`);

          io.to(`user_${receiverId}`).emit("typingStatus", {
            senderId: userId,
            senderName: user.fullName,
            isTyping: false
          });
        } else if (groupId) {
          // Validate groupId format
          if (typeof groupId !== 'string' || groupId.length !== 24) {
            return;
          }

          // Remove group typing status from Redis
          await redis.del(`group_typing:${groupId}:${userId}`);

          socket.to(`group_${groupId}`).emit("groupTypingStatus", {
            senderId: userId,
            senderName: user.fullName,
            groupId,
            isTyping: false
          });
        }
      } catch (error) {
        console.error('Error handling stopTyping event:', error.message);
      }
    });

    // Enhanced group room management
    socket.on("joinGroup", async (groupId) => {
      try {
        // Validate groupId format
        if (typeof groupId !== 'string' || groupId.length !== 24) {
          socket.emit('error', { message: 'Invalid group ID format' });
          return;
        }

        socket.join(`group_${groupId}`);
        console.log(`🔐 User ${user.fullName} joined group ${groupId}`);
        
        // Store group membership in Redis
        await redis.sadd(`group_members:${groupId}`, userId);
        
        // Notify group members
        socket.to(`group_${groupId}`).emit('userJoinedGroup', {
          userId: userId,
          userName: user.fullName,
          groupId: groupId
        });
      } catch (error) {
        console.error('Error joining group:', error.message);
        socket.emit('error', { message: 'Failed to join group' });
      }
    });

    // Enhanced group room leaving
    socket.on("leaveGroup", async (groupId) => {
      try {
        // Validate groupId format
        if (typeof groupId !== 'string' || groupId.length !== 24) {
          socket.emit('error', { message: 'Invalid group ID format' });
          return;
        }

        socket.leave(`group_${groupId}`);
        console.log(`🔐 User ${user.fullName} left group ${groupId}`);
        
        // Remove group membership from Redis
        await redis.srem(`group_members:${groupId}`, userId);
        
        // Notify group members
        socket.to(`group_${groupId}`).emit('userLeftGroup', {
          userId: userId,
          userName: user.fullName,
          groupId: groupId
        });
      } catch (error) {
        console.error('Error leaving group:', error.message);
        socket.emit('error', { message: 'Failed to leave group' });
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
      logSecurityEvent('Socket Error', {
        userId: userId,
        socketId: socket.id,
        error: error.message
      });
    });
  });

  // Periodic cleanup of stale data
  setInterval(async () => {
    try {
      // Clean up expired typing statuses
      const typingKeys = await redis.keys('typing:*');
      const groupTypingKeys = await redis.keys('group_typing:*');
      
      for (const key of [...typingKeys, ...groupTypingKeys]) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) { // No expiration set
          await redis.del(key);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error.message);
    }
  }, 30000); // Run every 30 seconds

  return {
    getReceiverSocketId: (userId) => userSocketMap.get(userId),
    getOnlineUsers,
    updateUserPresence,
    userSocketMap,
    socketUserMap,
    userLastSeen
  };
};

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🔐 Socket server shutting down gracefully...');
  io.close(() => {
    console.log('🔐 Socket server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔐 Socket server shutting down gracefully...');
  io.close(() => {
    console.log('🔐 Socket server closed');
    process.exit(0);
  });
});
