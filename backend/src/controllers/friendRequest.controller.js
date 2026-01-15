import FriendRequest from "../models/friendRequest.model.js";
import User from "../models/user.model.js";

// Send a friend request
export const sendFriendRequest = async (req, res) => {
  const { receiverUserTag } = req.body;
  const senderId = req.user._id;

  try {
    const receiver = await User.findOne({ userTag: receiverUserTag });
    if (!receiver) return res.status(404).json({ message: "User not found" });
    if (receiver._id.equals(senderId)) return res.status(400).json({ message: "Cannot send request to yourself" });

    // Check if already friends or request exists
    const existing = await FriendRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiver._id },
        { sender: receiver._id, receiver: senderId },
      ],
      status: { $in: ["pending", "accepted"] },
    });
    if (existing) return res.status(400).json({ message: "Request already exists or you are already friends" });

    const request = new FriendRequest({ sender: senderId, receiver: receiver._id });
    await request.save();
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Accept a friend request
export const acceptFriendRequest = async (req, res) => {
  const { requestId } = req.body;
  const userId = req.user._id;
  try {
    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (!request.receiver.equals(userId)) return res.status(403).json({ message: "Not authorized" });
    request.status = "accepted";
    await request.save();
    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Reject a friend request
export const rejectFriendRequest = async (req, res) => {
  const { requestId } = req.body;
  const userId = req.user._id;
  try {
    const request = await FriendRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (!request.receiver.equals(userId)) return res.status(403).json({ message: "Not authorized" });
    request.status = "rejected";
    await request.save();
    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// List incoming friend requests for the logged-in user
export const getIncomingFriendRequests = async (req, res) => {
  const userId = req.user._id;
  try {
    const requests = await FriendRequest.find({ receiver: userId, status: "pending" }).populate("sender", "fullName userTag profilePic");
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// List accepted friends for the logged-in user
export const getFriends = async (req, res) => {
  const userId = req.user._id;
  try {
    const requests = await FriendRequest.find({
      $or: [
        { sender: userId },
        { receiver: userId },
      ],
      status: "accepted",
    })
      .populate("sender", "fullName userTag profilePic")
      .populate("receiver", "fullName userTag profilePic");

    // Return the other user as friend
    const friends = requests.map((req) => {
      const friend = req.sender._id.equals(userId) ? req.receiver : req.sender;
      return friend;
    });
    res.status(200).json(friends);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
}; 