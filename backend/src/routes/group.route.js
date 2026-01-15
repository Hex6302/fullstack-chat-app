import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getUserGroups,
  getGroupDetails,
  joinGroupByInvite,
  addMemberToGroup,
  removeMemberFromGroup,
  leaveGroup,
  updateGroup,
  deleteGroup,
  getGroupMessages,
  sendGroupMessage
} from "../controllers/group.controller.js";

const router = express.Router();

// Group management routes
router.post("/create", protectRoute, createGroup);
router.get("/user-groups", protectRoute, getUserGroups);
router.get("/:groupId", protectRoute, getGroupDetails);
router.post("/join", protectRoute, joinGroupByInvite);
router.post("/:groupId/add-member", protectRoute, addMemberToGroup);
router.delete("/:groupId/remove-member/:memberId", protectRoute, removeMemberFromGroup);
router.delete("/:groupId/leave", protectRoute, leaveGroup);
router.put("/:groupId", protectRoute, updateGroup);
router.delete("/:groupId", protectRoute, deleteGroup);

// Group messaging routes
router.get("/:groupId/messages", protectRoute, getGroupMessages);
router.post("/:groupId/send", protectRoute, sendGroupMessage);

export default router;

