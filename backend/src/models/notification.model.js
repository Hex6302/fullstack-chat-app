import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "new_message",
        "member_joined",
        "member_left",
        "member_removed",
        "group_updated",
        "role_changed",
        "group_invite",
        "mention"
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      // Additional data specific to notification type
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GroupMessage",
      },
      oldRole: String,
      newRole: String,
      memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isSilent: {
      type: Boolean,
      default: false, // For push notifications
    },
  },
  { timestamps: true }
);

// Index for better query performance
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ groupId: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;






