import Message from "../models/message.model.js";

// Clean up expired self-destruct messages
export const cleanupExpiredMessages = async () => {
  try {
    const now = new Date();
    
    // Find messages that have expired
    const expiredMessages = await Message.find({
      "selfDestruct.enabled": true,
      "selfDestruct.expiresAt": { $lte: now },
    });

    if (expiredMessages.length > 0) {
      console.log(`🗑️ Cleaning up ${expiredMessages.length} expired self-destruct messages`);
      
      const deleted = await Message.deleteMany({
        "selfDestruct.enabled": true,
        "selfDestruct.expiresAt": { $lte: now },
      });

      console.log(`✅ Deleted ${deleted.deletedCount} expired messages`);
      return deleted.deletedCount;
    }
    
    return 0;
  } catch (error) {
    console.error("Error in cleanupExpiredMessages:", error.message);
    return 0;
  }
};

// Check if a message should be deleted on read
export const shouldDeleteOnRead = async (messageId, userId) => {
  try {
    const message = await Message.findById(messageId);
    
    if (!message || !message.selfDestruct?.enabled || !message.selfDestruct?.destructOnRead) {
      return false;
    }

    // Check if the message is being read by a different user than the sender
    if (message.senderId.toString() !== userId.toString()) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error in shouldDeleteOnRead:", error.message);
    return false;
  }
};

// Delete a specific self-destruct message
export const deleteSelfDestructMessage = async (messageId) => {
  try {
    const result = await Message.deleteOne({ _id: messageId });
    if (result.deletedCount > 0) {
      console.log(`🗑️ Deleted self-destruct message: ${messageId}`);
    }
    return result.deletedCount > 0;
  } catch (error) {
    console.error("Error deleting self-destruct message:", error.message);
    return false;
  }
};











