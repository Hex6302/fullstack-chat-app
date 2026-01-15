import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Enhanced authentication middleware with better security
export const protectRoute = async (req, res, next) => {
  try {
    // Try cookie first, then Authorization header (for mobile)
    let token = req.cookies.jwt;
    
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "No authentication token provided" 
      });
    }

    // Verify token with additional security checks
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      // Clear invalid token
      res.clearCookie('jwt', {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        sameSite: process.env.NODE_ENV === "development" ? "lax" : "strict"
      });
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: "Token Expired", 
          message: "Authentication token has expired. Please login again." 
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: "Invalid Token", 
          message: "Invalid authentication token. Please login again." 
        });
      } else {
        return res.status(401).json({ 
          error: "Authentication Failed", 
          message: "Token verification failed. Please login again." 
        });
      }
    }

    // Validate token structure
    if (!decoded.userId || typeof decoded.userId !== 'string') {
      return res.status(401).json({ 
        error: "Invalid Token", 
        message: "Malformed authentication token" 
      });
    }

    // Check if user still exists and is active
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(404).json({ 
        error: "User Not Found", 
        message: "User account no longer exists" 
      });
    }

    // Add user info to request
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    console.error("Error in protectRoute middleware:", error.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: "Authentication service temporarily unavailable" 
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select("-password");
        if (user) {
          req.user = user;
          req.userId = user._id;
        }
      } catch (jwtError) {
        // Token is invalid, but we don't fail the request
        console.log("Optional auth token invalid:", jwtError.message);
      }
    }

    next();
  } catch (error) {
    console.error("Error in optionalAuth middleware:", error.message);
    next(); // Continue even if there's an error
  }
};

// Role-based access control middleware
export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Authentication required" 
      });
    }

    if (roles.length === 0 || roles.includes(req.user.role)) {
      return next();
    }

    res.status(403).json({ 
      error: "Forbidden", 
      message: "Insufficient permissions to access this resource" 
    });
  };
};

// Check if user owns the resource
export const requireOwnership = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: "Unauthorized", 
        message: "Authentication required" 
      });
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (!resourceUserId) {
      return res.status(400).json({ 
        error: "Bad Request", 
        message: "Resource user ID not provided" 
      });
    }

    if (req.user._id.toString() !== resourceUserId.toString()) {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "You can only access your own resources" 
      });
    }

    next();
  };
};
