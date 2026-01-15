import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

// Get Socket.IO server URL from environment variable or use default
const getSocketUrl = () => {
  // In production, use environment variable or relative path
  if (import.meta.env.MODE === "production") {
    // If VITE_SOCKET_URL is set, use it; otherwise use relative path (same domain)
    return import.meta.env.VITE_SOCKET_URL || "/";
  }
  // In development, use localhost
  return import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";
};

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  userLastSeen: {},
  typingUsers: {},
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      localStorage.setItem("authUser", JSON.stringify(res.data));
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      // Try to restore from localStorage if cookie fails (mobile)
      const savedUser = localStorage.getItem("authUser");
      if (savedUser) {
        set({ authUser: JSON.parse(savedUser) });
        get().connectSocket();
      } else {
        set({ authUser: null });
      }
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      // Save auth user to localStorage for mobile persistence
      localStorage.setItem("authUser", JSON.stringify(res.data));
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      // Save auth user to localStorage for mobile persistence
      localStorage.setItem("authUser", JSON.stringify(res.data));
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      localStorage.removeItem("authUser");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  updateProfilePicture: async (imageData) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile-picture", { image: imageData });
      set({ authUser: res.data });
      toast.success("Profile picture updated successfully");
    } catch (error) {
      console.log("error in update profile picture:", error);
      toast.error(error.response?.data?.message || "Failed to update profile picture");
      throw error;
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    // Get auth token from cookies
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    const token = getCookie('token') || localStorage.getItem('token');

    const socket = io(getSocketUrl(), {
      auth: {
        token: token
      },
      query: {
        userId: authUser._id,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    console.log('🔌 Connecting socket with auth token:', token ? 'token provided' : 'no token');
    socket.connect();

    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    socket.on("userLastSeen", (lastSeenData) => {
      set((state) => ({
        userLastSeen: {
          ...state.userLastSeen,
          ...lastSeenData
        }
      }));
    });

    socket.on("userOnlineStatus", ({ userId, isOnline }) => {
      set((state) => {
        const newOnlineUsers = isOnline
          ? [...new Set([...state.onlineUsers, userId])]
          : state.onlineUsers.filter(id => id !== userId);
        return { onlineUsers: newOnlineUsers };
      });
    });

    // Global message listener for notifications
    socket.on("newMessage", async (newMessage) => {
      console.log('🔔 Global newMessage received:', newMessage);
      
      // Import notification store dynamically to avoid circular dependencies
      try {
        const { useNotificationStore } = await import('./useNotificationStore');
        const { useChatStore } = await import('./useChatStore');
        const { useGroupStore } = await import('./useGroupStore');
        
        const { addNotification, shouldNotify } = useNotificationStore.getState();
        const { selectedUser } = useChatStore.getState();
        const { selectedGroup } = useGroupStore.getState();
        
        console.log('🔔 Global notification check:', {
          senderId: newMessage.senderId._id,
          selectedUser: selectedUser?._id,
          selectedGroup: selectedGroup?._id
        });
        
        // Only show notification if not in a direct chat with this user
        if (await shouldNotify(newMessage.senderId._id, selectedUser?._id, 'direct')) {
          console.log('🔔 Triggering global notification for direct message');
          addNotification({
            type: 'message',
            senderName: newMessage.senderId.fullName || 'Someone',
            senderAvatar: newMessage.senderId.profilePic,
            message: newMessage.text || 'Sent an image',
            chatType: 'direct',
            senderId: newMessage.senderId._id
          });
        }
      } catch (error) {
        console.log('🔔 Error in global message handler:', error);
      }
    });

    // Global group message listener for notifications
    socket.on("newGroupMessage", async (newMessage) => {
      console.log('🔔 Global newGroupMessage received:', newMessage);
      
      try {
        const { useNotificationStore } = await import('./useNotificationStore');
        const { useChatStore } = await import('./useChatStore');
        const { useGroupStore } = await import('./useGroupStore');
        
        const { addNotification, shouldNotify } = useNotificationStore.getState();
        const { selectedUser } = useChatStore.getState();
        const { selectedGroup } = useGroupStore.getState();
        
        console.log('🔔 Global group notification check:', {
          groupId: newMessage.groupId,
          selectedGroup: selectedGroup?._id
        });
        
        // Only show notification if not in this group chat
        if (await shouldNotify(newMessage.senderId._id, newMessage.groupId, 'group')) {
          console.log('🔔 Triggering global notification for group message');
          addNotification({
            type: 'group_message',
            senderName: newMessage.senderId.fullName || 'Someone',
            senderAvatar: newMessage.senderId.profilePic,
            message: newMessage.text || 'Sent an image',
            groupName: newMessage.groupName || 'Group',
            groupId: newMessage.groupId,
            senderId: newMessage.senderId._id
          });
        }
      } catch (error) {
        console.log('🔔 Error in global group message handler:', error);
      }
    });

    socket.on("typingStatus", ({ senderId, isTyping }) => {
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [senderId]: isTyping
        }
      }));
    });

    socket.io.on("reconnect", () => {
      console.log("Reconnected to socket server");
      if (authUser) {
        socket.emit("userReconnected", { userId: authUser._id });
      }
    });

    socket.io.on("reconnect_error", () => {
      console.log("Reconnection error");
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },

  isRecentlyOffline: (userId) => {
    const lastSeen = get().userLastSeen[userId];
    if (!lastSeen) return false;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return lastSeen > fiveMinutesAgo;
  },

  getLastSeenTime: (userId) => {
    return get().userLastSeen[userId];
  },

  setTypingStatus: (receiverId, isTyping) => {
    const socket = get().socket;
    if (socket) {
      socket.emit("typing", { receiverId, isTyping });
    }
  },

  setGroupTypingStatus: (groupId, isTyping) => {
    const socket = get().socket;
    if (socket) {
      socket.emit("typing", { groupId, isTyping });
    }
  },

  joinGroupRoom: (groupId) => {
    const socket = get().socket;
    if (socket) {
      socket.emit("joinGroup", groupId);
    }
  },

  leaveGroupRoom: (groupId) => {
    const socket = get().socket;
    if (socket) {
      socket.emit("leaveGroup", groupId);
    }
  },

  isUserTyping: (userId) => {
    return get().typingUsers[userId] || false;
  },
}));
