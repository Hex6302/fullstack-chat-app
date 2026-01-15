import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";
import compression from "compression";
import { body, validationResult } from "express-validator";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health",
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many authentication attempts, please try again later",
  skipSuccessfulRequests: true,
});

export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: "Too many messages sent, please slow down",
});

export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.delayAfter || 100;
    return (used - delayAfter) * 500;
  },
  skip: (req) => req.path === "/api/health",
});

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https:"],
      connectSrc: ["'self'", "https://api.cloudinary.com", "wss:", "ws:"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
});

export const sanitizeData = [
  mongoSanitize(),
  xss(),
  hpp(),
];

export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res);
  },
  level: 6,
});

export const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  const maxSize = 10 * 1024 * 1024;
  if (contentLength > maxSize) {
    return res.status(413).json({ error: "Request entity too large" });
  }
  next();
};

export const securityLogger = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    const suspiciousKeywords = ["<script>", "javascript:", "onerror=", "onload=", "eval(", "expression("];
    const bodyStr = JSON.stringify(req.body).toLowerCase();
    const isSuspicious = suspiciousKeywords.some(keyword => bodyStr.includes(keyword.toLowerCase()));
    if (isSuspicious) {
      console.warn(`[SECURITY] Suspicious input detected from ${req.ip}`);
    }
  }
  next();
};

export const validateSignup = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  body("tag")
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("Tag must be between 1 and 20 characters"),
  body("profilePicture")
    .optional()
    .isURL()
    .withMessage("Profile picture must be a valid URL"),
];

export const validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};
