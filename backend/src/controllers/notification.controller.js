import Notification from "../models/notification.model.js";
import Group from "../models/group.model.js";
import User from "../models/user.model.js";

// Create a notification
export const createNotification = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();
    return notification;
  } catch (error) {
    console.log("Error creating notification:", error.message);
    throw error;
  }
};

// Get user's notifications
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { recipientId: userId };
    if (unreadOnly === "true") {
      query.isRead = false;
    }

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate([
        { path: "groupId", select: "name profilePic" },
        { path: "data.senderId", select: "fullName userTag profilePic" },
        { path: "data.memberId", select: "fullName userTag profilePic" }
      ]);

    const totalNotifications = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      recipientId: userId, 
      isRead: false 
    });

    res.status(200).json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalNotifications,
        pages: Math.ceil(totalNotifications / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.log("Error in getUserNotifications:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json(notification);
  } catch (error) {
    console.log("Error in markNotificationAsRead:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.query;

    const query = { recipientId: userId, isRead: false };
    if (groupId) {
      query.groupId = groupId;
    }

    const result = await Notification.updateMany(query, { isRead: true });

    res.status(200).json({
      message: `${result.modifiedCount} notifications marked as read`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.log("Error in markAllNotificationsAsRead:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipientId: userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.log("Error in deleteNotification:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Clear all notifications for a group
export const clearGroupNotifications = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const result = await Notification.deleteMany({
      recipientId: userId,
      groupId,
    });

    res.status(200).json({
      message: `${result.deletedCount} notifications cleared`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.log("Error in clearGroupNotifications:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get notification settings for a user
export const getNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    // For now, return default settings
    // In a real app, you'd store user preferences
    const settings = {
      newMessages: true,
      memberJoins: true,
      memberLeaves: false,
      groupUpdates: true,
      mentions: true,
      silentMode: false,
    };

    res.status(200).json(settings);
  } catch (error) {
    console.log("Error in getNotificationSettings:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update notification settings
export const updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;
    const settings = req.body;

    // In a real app, you'd save these settings to a user preferences collection
    // For now, just return success
    res.status(200).json({
      message: "Notification settings updated successfully",
      settings,
    });
  } catch (error) {
    console.log("Error in updateNotificationSettings:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};






