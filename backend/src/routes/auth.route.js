import express from "express";
import { 
  checkAuth, 
  login, 
  logout, 
  signup, 
  updateProfile, 
  updateProfilePicture, 
  searchUserByTag 
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  validateSignup, 
  validateLogin, 
  handleValidationErrors 
} from "../middleware/security.middleware.js";

const router = express.Router();

// Public routes with validation
router.post("/signup", validateSignup, handleValidationErrors, signup);
router.post("/login", validateLogin, handleValidationErrors, login);
router.post("/logout", logout);

// Protected routes
router.put("/update-profile", protectRoute, updateProfile);
router.put("/update-profile-picture", protectRoute, updateProfilePicture);
router.get("/check", protectRoute, checkAuth);
router.get("/search", searchUserByTag);

export default router;
