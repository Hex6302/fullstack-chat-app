import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import multer from "multer";
import {
  uploadFile,
  deleteFile,
  getFileInfo,
} from "../controllers/fileUpload.controller.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Apply auth middleware to all routes
router.use(protectRoute);

// File upload routes
router.post("/upload", upload.single('file'), uploadFile);
router.delete("/:publicId", deleteFile);
router.get("/:publicId", getFileInfo);

export default router;






