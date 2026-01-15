import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import FriendRequest from "../models/friendRequest.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { sanitizeInput, logSecurityEvent } from "../lib/utils.js";
import { shouldDeleteOnRead, deleteSelfDestructMessage } from "../lib/selfDestructCleanup.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    
    // Find accepted friends with proper validation
    const requests = await FriendRequest.find({
      $or: [
        { sender: loggedInUserId },
        { receiver: loggedInUserId },
      ],
      status: "accepted",
    })
      .populate("sender", "fullName userTag profilePic")
      .populate("receiver", "fullName userTag profilePic");

    // Get the other user as friend
    const friends = requests.map((req) => {
      const friend = req.sender._id.equals(loggedInUserId) ? req.receiver : req.sender;
      return friend;
    });

    // Get unread message counts for each friend
    const usersWithUnreadCounts = await Promise.all(
      friends.map(async (user) => {
        const unreadCount = await Message.countDocuments({
          senderId: user._id,
          receiverId: loggedInUserId,
          status: { $ne: "read" },
        });
        return {
          ...user.toObject(),
          unreadCount,
        };
      })
    );

    res.status(200).json(usersWithUnreadCounts);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: "Unable to fetch friends list" 
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    // Validate userToChatId format
    if (!userToChatId || typeof userToChatId !== 'string') {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "Invalid user ID provided" 
      });
    }

    // Check if users are friends before allowing message access
    const friendship = await FriendRequest.findOne({
      $or: [
        { sender: myId, receiver: userToChatId },
        { sender: userToChatId, receiver: myId },
      ],
      status: "accepted",
    });

    if (!friendship) {
      return res.status(403).json({ 
        error: "Access Denied", 
        message: "You can only view messages with your friends" 
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 }); // Sort by creation time

    // Mark messages as read and check for self-destruct on read
    const messagesToDelete = [];
    
    for (const msg of messages) {
      if (msg.selfDestruct?.enabled && msg.selfDestruct?.destructOnRead) {
        // Mark as read
        if (msg.status !== "read") {
          await Message.updateOne({ _id: msg._id }, { status: "read" });
          messagesToDelete.push(msg._id);
        }
      } else {
        // Regular read marking
        await Message.updateOne(
          { _id: msg._id, senderId: userToChatId, receiverId: myId, status: { $ne: "read" } },
          { status: "read" }
        );
      }
    }

    // Delete self-destruct messages that should be removed on read
    if (messagesToDelete.length > 0) {
      await Message.deleteMany({ _id: { $in: messagesToDelete } });
      console.log(`🗑️ Deleted ${messagesToDelete.length} self-destruct messages on read`);
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages controller:", error.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: "Unable to fetch messages" 
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, selfDestruct, preventForwarding, disableCopy, forwardedFrom, isForwarded } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // Validate receiverId
    if (!receiverId || typeof receiverId !== 'string') {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "Invalid receiver ID" 
      });
    }

    // Check if users are friends
    const friendship = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
      status: "accepted",
    });

    if (!friendship) {
      return res.status(403).json({ 
        error: "Access Denied", 
        message: "You can only send messages to your friends" 
      });
    }

    // Validate message content
    if (!text && !image) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "Message must contain text or image" 
      });
    }

    let sanitizedText = null;
    let imageUrl = null;

    // Sanitize text if provided
    if (text) {
      sanitizedText = sanitizeInput(text);
      if (sanitizedText.length === 0) {
        return res.status(400).json({ 
          error: "Validation Error", 
          message: "Message text cannot be empty" 
        });
      }
    }

    // Process image if provided
    if (image) {
      // Validate base64 image
      if (!image.startsWith('data:image/')) {
        return res.status(400).json({ 
          error: "Validation Error", 
          message: "Invalid image format" 
        });
      }

      // Upload to Cloudinary with security settings
      const uploadResponse = await cloudinary.uploader.upload(image, {
        resource_type: "image",
        folder: "chat-images",
        public_id: `msg_${senderId}_${Date.now()}`,
        transformation: [
          { width: 800, height: 600, crop: "limit" },
          { quality: "auto", fetch_format: "auto" }
        ]
      });
      imageUrl = uploadResponse.secure_url;
    }

    // Calculate expiresAt if self-destruct is enabled
    const selfDestructData = {};
    if (selfDestruct?.enabled) {
      if (selfDestruct.expiresAfter) {
        // Timer-based: message expires after X seconds
        selfDestructData.enabled = true;
        selfDestructData.expiresAfter = selfDestruct.expiresAfter;
        selfDestructData.expiresAt = new Date(Date.now() + selfDestruct.expiresAfter * 1000);
        selfDestructData.destructOnRead = false;
      } else if (selfDestruct.destructOnRead) {
        // Read-based: message expires when read
        selfDestructData.enabled = true;
        selfDestructData.destructOnRead = true;
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text: sanitizedText,
      image: imageUrl,
      status: "sent",
      selfDestruct: selfDestructData.enabled ? selfDestructData : undefined,
      preventForwarding: preventForwarding || false,
      disableCopy: disableCopy || false,
      forwardedFrom: forwardedFrom || undefined,
      isForwarded: isForwarded || false,
    });

    await newMessage.save();

    // Populate the message with sender details
    const populatedMessage = await Message.findById(newMessage._id)
      .populate("senderId", "fullName userTag profilePic");

    const receiverSocketId = getReceiverSocketId(receiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
      // Update status to delivered when receiver is online
      newMessage.status = "delivered";
      await newMessage.save();
    }

    // Log message sending
    logSecurityEvent('Message Sent', {
      senderId: senderId,
      receiverId: receiverId,
      messageId: newMessage._id,
      hasImage: !!imageUrl
    }, req);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage controller:", error.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: "Unable to send message" 
    });
  }
};

export const clearChat = async (req, res) => {
  try {
    const { id: otherUserId } = req.params;
    const myId = req.user._id;

    // Validate otherUserId
    if (!otherUserId || typeof otherUserId !== 'string') {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "Invalid user ID" 
      });
    }

    // Check if users are friends
    const friendship = await FriendRequest.findOne({
      $or: [
        { sender: myId, receiver: otherUserId },
        { sender: otherUserId, receiver: myId },
      ],
      status: "accepted",
    });

    if (!friendship) {
      return res.status(403).json({ 
        error: "Access Denied", 
        message: "You can only clear chats with your friends" 
      });
    }

    // Delete all messages between the two users
    const result = await Message.deleteMany({
      $or: [
        { senderId: myId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: myId },
      ],
    });

    // Log chat clearing
    logSecurityEvent('Chat Cleared', {
      userId: myId,
      otherUserId: otherUserId,
      messagesDeleted: result.deletedCount
    }, req);

    res.status(200).json({ 
      message: "Chat cleared successfully",
      messagesDeleted: result.deletedCount
    });
  } catch (error) {
    console.error("Error in clearChat controller:", error.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: "Unable to clear chat" 
    });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { id: otherUserId, messageId } = req.params;
    const myId = req.user._id;

    // Validate parameters
    if (!otherUserId || !messageId) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "User ID and message ID are required" 
      });
    }

    // Check if users are friends
    const friendship = await FriendRequest.findOne({
      $or: [
        { sender: myId, receiver: otherUserId },
        { sender: otherUserId, receiver: myId },
      ],
      status: "accepted",
    });

    if (!friendship) {
      return res.status(403).json({ 
        error: "Access Denied", 
        message: "You can only delete messages with your friends" 
      });
    }

    // Delete the specific message
    const deletedMessage = await Message.findOneAndDelete({
      _id: messageId,
      $or: [
        { senderId: myId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: myId },
      ],
    });

    if (!deletedMessage) {
      return res.status(404).json({ 
        error: "Message Not Found", 
        message: "Message not found or you don't have permission to delete it" 
      });
    }

    // Log message deletion
    logSecurityEvent('Message Deleted', {
      userId: myId,
      otherUserId: otherUserId,
      messageId: messageId
    }, req);

    res.status(200).json({ 
      message: "Message deleted successfully" 
    });
  } catch (error) {
    console.error("Error in deleteChat controller:", error.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: "Unable to delete message" 
    });
  }
};
