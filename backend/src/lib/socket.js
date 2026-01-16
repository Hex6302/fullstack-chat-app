import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { logSecurityEvent } from "./utils.js";

const app = express();
const server = http.createServer(app);

// Enhanced Socket.IO configuration with security
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
  // Optimized for low latency
  pingTimeout: 20000, // Reduced from 60s to 20s for faster reconnection
  pingInterval: 10000, // Reduced from 25s to 10s for better connection health
  upgradeTimeout: 10000, // Faster upgrade to websocket
  maxHttpBufferSize: 1e6, // 1MB max message size
  // Enable compression for better performance
  perMessageDeflate: {
    threshold: 1024, // Only compress messages > 1KB
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    }
  }
});

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    const userId = socket.handshake.query.userId;
    
    console.log('🔌 Socket connection attempt:', {
      hasToken: !!token,
      hasUserId: !!userId,
      socketId: socket.id
    });
    
    // For development: allow userId-based authentication if no token
    if (!token && userId) {
      console.log('⚠️ Development mode: using userId authentication');
      const user = await User.findById(userId).select("-password");
      if (!user) {
        return next(new Error('User not found'));
      }
      socket.userId = user._id.toString();
      socket.user = user;
      return next();
    }
    
    if (!token) {
      console.log('❌ Socket connection rejected: No token or userId provided');
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
    
    console.log('✅ Socket authenticated for user:', user._id);
    next();
  } catch (error) {
    console.log('❌ Socket auth error:', error.message);
    logSecurityEvent('Socket Connection Rejected', {
      reason: 'Token verification failed',
      error: error.message,
      socketId: socket.id,
      ip: socket.handshake.address
    });
    next(new Error('Authentication failed'));
  }
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// Store online users with additional metadata
const userSocketMap = {}; // {userId: socketId}
const userLastSeen = {}; // {userId: timestamp}
const socketUserMap = {}; // {socketId: userId} for reverse lookup

io.on("connection", (socket) => {
  const userId = socket.userId;
  const user = socket.user;
  
  console.log(`🔐 Authenticated user connected: ${user.fullName} (${userId})`);
  
  // Store user connection
  userSocketMap[userId] = socket.id;
  socketUserMap[socket.id] = userId;
  
  // Update last seen
  userLastSeen[userId] = Date.now();
  
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
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`🔐 User disconnected: ${user.fullName} (${userId}) - Reason: ${reason}`);
    
    // Clean up user data
    if (userId) {
      delete userSocketMap[userId];
      delete socketUserMap[socket.id];
      userLastSeen[userId] = Date.now();
      
      // Emit last seen update
      io.emit("userLastSeen", { [userId]: userLastSeen[userId] });
      
      // Log disconnection
      logSecurityEvent('Socket Disconnection', {
        userId: userId,
        userName: user.fullName,
        socketId: socket.id,
        reason: reason
      });
    }
    
    // Update online users list
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

  // Enhanced typing status with validation
  socket.on("typing", ({ receiverId, groupId, isTyping }) => {
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

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("typingStatus", {
            senderId: userId,
            senderName: user.fullName,
            isTyping
          });
        }
      } else if (groupId) {
        // Validate groupId format
        if (typeof groupId !== 'string' || groupId.length !== 24) {
          return;
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
  socket.on("stopTyping", ({ receiverId, groupId }) => {
    try {
      if (receiverId) {
        // Validate receiverId format
        if (typeof receiverId !== 'string' || receiverId.length !== 24) {
          return;
        }

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("typingStatus", {
            senderId: userId,
            senderName: user.fullName,
            isTyping: false
          });
        }
      } else if (groupId) {
        // Validate groupId format
        if (typeof groupId !== 'string' || groupId.length !== 24) {
          return;
        }

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
  socket.on("joinGroup", (groupId) => {
    try {
      // Validate groupId format
      if (typeof groupId !== 'string' || groupId.length !== 24) {
        socket.emit('error', { message: 'Invalid group ID format' });
        return;
      }

      socket.join(`group_${groupId}`);
      console.log(`🔐 User ${user.fullName} joined group ${groupId}`);
      
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
  socket.on("leaveGroup", (groupId) => {
    try {
      // Validate groupId format
      if (typeof groupId !== 'string' || groupId.length !== 24) {
        socket.emit('error', { message: 'Invalid group ID format' });
        return;
      }

      socket.leave(`group_${groupId}`);
      console.log(`🔐 User ${user.fullName} left group ${groupId}`);
      
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

export { io, app, server };
