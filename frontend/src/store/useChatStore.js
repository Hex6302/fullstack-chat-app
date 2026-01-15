import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useNotificationStore } from "./useNotificationStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  selfDestructMode: {
    enabled: false,
    duration: null, // null means "on read", number means seconds
    chatId: null,
  },
  deletingMessages: new Set(), // Track messages being animated out
  protectMode: {
    preventForwarding: false,
    disableCopy: false,
    chatId: null,
  },

  getFriends: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/friends/friends");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      
      // Refresh user list to update unread counts after messages are loaded
      get().getFriends();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  clearChat: async (userId) => {
    try {
      await axiosInstance.delete(`/messages/clear/${userId}`);
      set({ messages: [] });
      // Refresh user list to update unread counts
      get().getFriends();
      toast.success("Chat cleared successfully");
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  deleteChat: async (userId, messageId) => {
    try {
      await axiosInstance.delete(`/messages/delete/${userId}/${messageId}`);
      set(state => ({
        messages: state.messages.filter(msg => msg._id !== messageId)
      }));
      toast.success("Message deleted successfully");
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    
    console.log('🔔 Subscribing to messages for user:', selectedUser._id);
    console.log('🔔 Socket connected:', socket?.connected);

    // Listen for messages from the selected user only
    socket.on("newMessage", (newMessage) => {
      console.log('🔔 Chat newMessage received:', newMessage);
      console.log('🔔 Message senderId:', newMessage.senderId);
      console.log('🔔 Selected user:', selectedUser);
      
      const isMessageSentFromSelectedUser = newMessage.senderId._id === selectedUser._id;
      
      if (isMessageSentFromSelectedUser) {
        console.log('🔔 Adding message to chat');
        set({
          messages: [...get().messages, newMessage],
        });
        
        // Handle self-destruct timers on the client side
        if (newMessage.selfDestruct?.enabled && newMessage.selfDestruct?.expiresAfter) {
          const duration = newMessage.selfDestruct.expiresAfter * 1000; // Convert to milliseconds
          console.log(`⏰ Message will self-destruct in ${newMessage.selfDestruct.expiresAfter} seconds`);
          
          setTimeout(() => {
            console.log(`🗑️ Self-destructing message: ${newMessage._id}`);
            
            // Mark message for deletion animation
            set(state => ({
              deletingMessages: new Set([...state.deletingMessages, newMessage._id])
            }));
            
            // Wait for fade-out animation to complete, then remove
            setTimeout(() => {
              set(state => ({
                messages: state.messages.filter(msg => msg._id !== newMessage._id),
                deletingMessages: (() => {
                  const newSet = new Set(state.deletingMessages);
                  newSet.delete(newMessage._id);
                  return newSet;
                })()
              }));
              toast.info("Message self-destructed");
            }, 500); // Match CSS animation duration
          }, duration);
        }
        
        // Refresh user list to update unread counts when new message is received
        get().getFriends();
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  searchUserByTag: async (userTag) => {
    try {
      const res = await axiosInstance.get(`/auth/search?userTag=${userTag}`);
      return res.data;
    } catch (error) {
      toast.error(error.response.data.message);
      return null;
    }
  },

  sendFriendRequest: async (receiverUserTag) => {
    try {
      const res = await axiosInstance.post("/friends/send", { receiverUserTag });
      toast.success("Friend request sent");
      return res.data;
    } catch (error) {
      toast.error(error.response.data.message);
      return null;
    }
  },

  getIncomingFriendRequests: async () => {
    try {
      const res = await axiosInstance.get("/friends/incoming");
      return res.data;
    } catch (error) {
      toast.error(error.response.data.message);
      return [];
    }
  },

  acceptFriendRequest: async (requestId) => {
    try {
      const res = await axiosInstance.post("/friends/accept", { requestId });
      toast.success("Friend request accepted");
      get().getFriends();
      return res.data;
    } catch (error) {
      toast.error(error.response.data.message);
      return null;
    }
  },

  rejectFriendRequest: async (requestId) => {
    try {
      const res = await axiosInstance.post("/friends/reject", { requestId });
      toast.success("Friend request rejected");
      return res.data;
    } catch (error) {
      toast.error(error.response.data.message);
      return null;
    }
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
    // Reset self-destruct mode when switching chats
    set({ selfDestructMode: { enabled: false, duration: null, chatId: null } });
    // Clear deleting messages set
    set({ deletingMessages: new Set() });
    // Reset protection mode
    set({ protectMode: { preventForwarding: false, disableCopy: false, chatId: null } });
  },

  // Set protection mode
  setProtectMode: (settings) => {
    const { selectedUser } = get();
    if (!selectedUser) return;
    
    set({
      protectMode: {
        ...settings,
        chatId: selectedUser._id,
      },
    });
    
    const features = [];
    if (settings.preventForwarding) features.push("no forwarding");
    if (settings.disableCopy) features.push("no copy/paste");
    
    toast.success(`Content protection enabled: ${features.join(", ")}`);
  },

  // Check if message is being deleted (for animation)
  isMessageDeleting: (messageId) => {
    return get().deletingMessages.has(messageId);
  },

  // Enable self-destruct mode for current chat
  enableSelfDestructMode: (duration) => {
    const { selectedUser } = get();
    if (!selectedUser) return;
    
    set({
      selfDestructMode: {
        enabled: true,
        duration: duration, // null for "on read", number for seconds
        chatId: selectedUser._id,
      },
    });
    
    toast.success(
      duration 
        ? `Self-destruct mode enabled for ${duration} seconds`
        : "Self-destruct mode enabled: messages delete on read"
    );
  },

  // Disable self-destruct mode
  disableSelfDestructMode: () => {
    set({
      selfDestructMode: {
        enabled: false,
        duration: null,
        chatId: null,
      },
    });
  },

  // Check if message should be self-destructed
  shouldSelfDestructMessage: (messageId) => {
    const { selfDestructMode, messages } = get();
    
    if (!selfDestructMode.enabled) return false;
    
    const message = messages.find(m => m._id === messageId);
    if (!message || message.selfDestruct?.enabled) return false;
    
    // Check if it's a timer-based or read-based self-destruct
    if (selfDestructMode.duration) {
      // Timer-based: schedule deletion
      setTimeout(() => {
        set(state => ({
          messages: state.messages.filter(m => m._id !== messageId)
        }));
        toast.info("Message self-destructed");
      }, selfDestructMode.duration * 1000);
      return true;
    } else {
      // Read-based: handled when message is read
      return true;
    }
  },
}));
