import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Notification from "../models/notification.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, description, isPrivate, maxMembers } = req.body;
    const adminId = req.user._id;

    // Create the group
    const newGroup = new Group({
      name,
      description,
      admin: adminId,
      isPrivate: isPrivate || false,
      maxMembers: maxMembers || 100,
      members: [{
        userId: adminId,
        role: "admin",
        joinedAt: new Date(),
        isActive: true
      }]
    });

    await newGroup.save();

    // Populate the group with admin details
    const populatedGroup = await Group.findById(newGroup._id)
      .populate("admin", "fullName userTag profilePic")
      .populate("members.userId", "fullName userTag profilePic");

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error("Error in createGroup: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all groups for a user
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({
      "members.userId": userId,
      "members.isActive": true
    })
    .populate("admin", "fullName userTag profilePic")
    .populate("members.userId", "fullName userTag profilePic")
    .sort({ updatedAt: -1 });

    // Get unread message counts for each group
    const groupsWithUnreadCounts = await Promise.all(
      groups.map(async (group) => {
        const unreadCount = await Message.countDocuments({
          groupId: group._id,
          senderId: { $ne: userId },
          readBy: { $nin: [userId] }
        });
        return {
          ...group.toObject(),
          unreadCount
        };
      })
    );

    res.status(200).json(groupsWithUnreadCounts);
  } catch (error) {
    console.error("Error in getUserGroups: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get group details
export const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findOne({
      _id: groupId,
      "members.userId": userId,
      "members.isActive": true
    })
    .populate("admin", "fullName userTag profilePic")
    .populate("members.userId", "fullName userTag profilePic");

    if (!group) {
      return res.status(404).json({ error: "Group not found or access denied" });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error("Error in getGroupDetails: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Join group by invite code
export const joinGroupByInvite = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user._id;

    const group = await Group.findOne({ inviteCode });
    if (!group) {
      return res.status(404).json({ error: "Invalid invite code" });
    }

    // Check if user is already a member
    const existingMember = group.members.find(
      member => member.userId.toString() === userId.toString()
    );

    if (existingMember) {
      if (existingMember.isActive) {
        return res.status(400).json({ error: "You are already a member of this group" });
      } else {
        // Reactivate the member
        existingMember.isActive = true;
        existingMember.joinedAt = new Date();
        await group.save();
      }
    } else {
      // Check if group has reached max members
      const activeMembers = group.members.filter(member => member.isActive);
      if (activeMembers.length >= group.maxMembers) {
        return res.status(400).json({ error: "Group is full" });
      }

      // Add new member
      group.members.push({
        userId,
        role: "member",
        joinedAt: new Date(),
        isActive: true
      });
      await group.save();
    }

    // Create notification for group members
    const notification = new Notification({
      sender: userId,
      receivers: group.members
        .filter(member => member.userId.toString() !== userId.toString() && member.isActive)
        .map(member => member.userId),
      type: "group_join",
      groupId: group._id,
      message: `${req.user.fullName} joined the group`
    });
    await notification.save();

    // Emit socket event to group members
    group.members.forEach(member => {
      if (member.isActive) {
        io.to(member.userId.toString()).emit("groupUpdate", {
          type: "member_joined",
          groupId: group._id,
          member: req.user
        });
      }
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "fullName userTag profilePic")
      .populate("members.userId", "fullName userTag profilePic");

    res.status(200).json(populatedGroup);
  } catch (error) {
    console.error("Error in joinGroupByInvite: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add member to group (admin only)
export const addMemberToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userTag } = req.body;
    const adminId = req.user._id;

    const group = await Group.findOne({
      _id: groupId,
      admin: adminId
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found or you are not the admin" });
    }

    // Find user by tag
    const user = await User.findOne({ userTag });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is already a member
    const existingMember = group.members.find(
      member => member.userId.toString() === user._id.toString()
    );

    if (existingMember && existingMember.isActive) {
      return res.status(400).json({ error: "User is already a member of this group" });
    }

    // Check if group has reached max members
    const activeMembers = group.members.filter(member => member.isActive);
    if (activeMembers.length >= group.maxMembers) {
      return res.status(400).json({ error: "Group is full" });
    }

    if (existingMember) {
      // Reactivate the member
      existingMember.isActive = true;
      existingMember.joinedAt = new Date();
    } else {
      // Add new member
      group.members.push({
        userId: user._id,
        role: "member",
        joinedAt: new Date(),
        isActive: true
      });
    }

    await group.save();

    // Create notification for the added user
    const notification = new Notification({
      sender: adminId,
      receivers: [user._id],
      type: "group_invite",
      groupId: group._id,
      message: `You have been added to the group "${group.name}"`
    });
    await notification.save();

    // Emit socket event to group members
    group.members.forEach(member => {
      if (member.isActive) {
        io.to(member.userId.toString()).emit("groupUpdate", {
          type: "member_added",
          groupId: group._id,
          member: user
        });
      }
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "fullName userTag profilePic")
      .populate("members.userId", "fullName userTag profilePic");

    res.status(200).json(populatedGroup);
  } catch (error) {
    console.error("Error in addMemberToGroup: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Remove member from group (admin only)
export const removeMemberFromGroup = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const adminId = req.user._id;

    const group = await Group.findOne({
      _id: groupId,
      admin: adminId
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found or you are not the admin" });
    }

    const member = group.members.find(
      member => member.userId.toString() === memberId
    );

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Deactivate the member
    member.isActive = false;

    await group.save();

    // Create notification for the removed user
    const notification = new Notification({
      sender: adminId,
      receivers: [memberId],
      type: "group_remove",
      groupId: group._id,
      message: `You have been removed from the group "${group.name}"`
    });
    await notification.save();

    // Emit socket event to group members
    group.members.forEach(member => {
      if (member.isActive) {
        io.to(member.userId.toString()).emit("groupUpdate", {
          type: "member_removed",
          groupId: group._id,
          memberId
        });
      }
    });

    res.status(200).json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("Error in removeMemberFromGroup: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Leave group
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findOne({
      _id: groupId,
      "members.userId": userId,
      "members.isActive": true
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found or you are not a member" });
    }

    // Check if user is the admin
    if (group.admin.toString() === userId.toString()) {
      return res.status(400).json({ error: "Admin cannot leave the group. Transfer admin rights first." });
    }

    const member = group.members.find(
      member => member.userId.toString() === userId.toString()
    );

    if (member) {
      member.isActive = false;
      await group.save();
    }

    // Create notification for group members
    const notification = new Notification({
      sender: userId,
      receivers: group.members
        .filter(member => member.userId.toString() !== userId.toString() && member.isActive)
        .map(member => member.userId),
      type: "group_leave",
      groupId: group._id,
      message: `${req.user.fullName} left the group`
    });
    await notification.save();

    // Emit socket event to group members
    group.members.forEach(member => {
      if (member.isActive) {
        io.to(member.userId.toString()).emit("groupUpdate", {
          type: "member_left",
          groupId: group._id,
          member: req.user
        });
      }
    });

    res.status(200).json({ message: "Left group successfully" });
  } catch (error) {
    console.error("Error in leaveGroup: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update group details (admin only)
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, isPrivate, maxMembers } = req.body;
    const adminId = req.user._id;

    const group = await Group.findOne({
      _id: groupId,
      admin: adminId
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found or you are not the admin" });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (isPrivate !== undefined) group.isPrivate = isPrivate;
    if (maxMembers) group.maxMembers = maxMembers;

    await group.save();

    // Emit socket event to group members
    group.members.forEach(member => {
      if (member.isActive) {
        io.to(member.userId.toString()).emit("groupUpdate", {
          type: "group_updated",
          groupId: group._id,
          group
        });
      }
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("admin", "fullName userTag profilePic")
      .populate("members.userId", "fullName userTag profilePic");

    res.status(200).json(populatedGroup);
  } catch (error) {
    console.error("Error in updateGroup: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete group (admin only)
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const adminId = req.user._id;

    const group = await Group.findOne({
      _id: groupId,
      admin: adminId
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found or you are not the admin" });
    }

    // Delete all messages in the group
    await Message.deleteMany({ groupId: group._id });

    // Create notification for group members
    const notification = new Notification({
      sender: adminId,
      receivers: group.members
        .filter(member => member.userId.toString() !== adminId.toString() && member.isActive)
        .map(member => member.userId),
      type: "group_delete",
      groupId: group._id,
      message: `The group "${group.name}" has been deleted`
    });
    await notification.save();

    // Emit socket event to group members
    group.members.forEach(member => {
      if (member.isActive) {
        io.to(member.userId.toString()).emit("groupUpdate", {
          type: "group_deleted",
          groupId: group._id
        });
      }
    });

    await Group.findByIdAndDelete(groupId);

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error in deleteGroup: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get group messages
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Check if user is a member of the group
    const group = await Group.findOne({
      _id: groupId,
      "members.userId": userId,
      "members.isActive": true
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found or access denied" });
    }

    const messages = await Message.find({ groupId })
      .populate("senderId", "fullName userTag profilePic")
      .sort({ createdAt: 1 });

    // Mark messages as read for this user
    await Message.updateMany(
      {
        groupId,
        senderId: { $ne: userId },
        readBy: { $nin: [userId] }
      },
      { $addToSet: { readBy: userId } }
    );

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getGroupMessages: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send message to group
export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image, preventForwarding, disableCopy, forwardedFrom, isForwarded } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;

    // Check if user is a member of the group
    const group = await Group.findOne({
      _id: groupId,
      "members.userId": senderId,
      "members.isActive": true
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found or access denied" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      groupId,
      text,
      image: imageUrl,
      readBy: [senderId],
      preventForwarding: preventForwarding || false,
      disableCopy: disableCopy || false,
      forwardedFrom: forwardedFrom || undefined,
      isForwarded: isForwarded || false,
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("senderId", "fullName userTag profilePic");

    // Emit socket event to all group members
    group.members.forEach(member => {
      if (member.isActive) {
        io.to(member.userId.toString()).emit("newGroupMessage", populatedMessage);
      }
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in sendGroupMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

