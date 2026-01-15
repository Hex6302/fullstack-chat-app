import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearGroupNotifications,
  getNotificationSettings,
  updateNotificationSettings,
} from "../controllers/notification.controller.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(protectRoute);

// Notification routes
router.get("/", getUserNotifications);
router.put("/:notificationId/read", markNotificationAsRead);
router.put("/mark-all-read", markAllNotificationsAsRead);
router.delete("/:notificationId", deleteNotification);
router.delete("/group/:groupId", clearGroupNotifications);
router.get("/settings/:groupId", getNotificationSettings);
router.put("/settings/:groupId", updateNotificationSettings);

export default router;






