import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // Not required for group messages
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      // Not required for direct messages
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    messageType: {
      type: String,
      enum: ["text", "image", "system"],
      default: "text",
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    selfDestruct: {
      enabled: {
        type: Boolean,
        default: false,
      },
      expiresAt: {
        type: Date,
      },
      expiresAfter: {
        type: Number, // seconds
      },
      destructOnRead: {
        type: Boolean,
        default: false,
      },
    },
    preventForwarding: {
      type: Boolean,
      default: false,
    },
    disableCopy: {
      type: Boolean,
      default: false,
    },
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isForwarded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Validation to ensure either receiverId or groupId is provided
messageSchema.pre("validate", function(next) {
  if (!this.receiverId && !this.groupId) {
    return next(new Error("Either receiverId or groupId must be provided"));
  }
  if (this.receiverId && this.groupId) {
    return next(new Error("Cannot have both receiverId and groupId"));
  }
  next();
});

// Index for better query performance
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ groupId: 1, createdAt: -1 });
messageSchema.index({ readBy: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
