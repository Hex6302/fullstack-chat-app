import jwt from "jsonwebtoken";
import crypto from "crypto";

// Enhanced token generation with better security
export const generateToken = (userId, res) => {
  // Generate a random session ID for additional security
  const sessionId = crypto.randomBytes(32).toString('hex');
  
  const token = jwt.sign(
    { 
      userId, 
      sessionId,
      iat: Math.floor(Date.now() / 1000) // issued at
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: "7d",
      issuer: "chat-app",
      audience: "chat-app-users"
    }
  );

  // Enhanced cookie settings for better security
  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV !== "development", // HTTPS only in production
    sameSite: process.env.NODE_ENV === "development" ? "lax" : "strict", // CSRF protection
    path: "/", // Available on all routes
    domain: process.env.NODE_ENV === "production" ? process.env.COOKIE_DOMAIN : undefined
  });

  return token;
};

// Generate refresh token for enhanced security
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { 
      userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    }, 
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, 
    {
      expiresIn: "30d",
      issuer: "chat-app",
      audience: "chat-app-users"
    }
  );
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Generate secure random string
export const generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash sensitive data
export const hashData = (data, salt = null) => {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512');
  return {
    hash: hash.toString('hex'),
    salt: actualSalt
  };
};

// Verify hashed data
export const verifyHash = (data, hash, salt) => {
  const hashToVerify = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
  return hashToVerify.toString('hex') === hash;
};

// Sanitize user input
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Validate password strength (simplified)
export const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Rate limiting helper
export const createRateLimitKey = (req) => {
  return `${req.ip}-${req.user?._id || 'anonymous'}`;
};

// Log security events
export const logSecurityEvent = (event, details, req) => {
  const logData = {
    timestamp: new Date().toISOString(),
    event,
    details,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    userId: req?.user?._id
  };
  
  console.warn('Security Event:', logData);
  
  // In production, you might want to send this to a security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to security monitoring service
  }
};
