import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useNotificationStore } from "./useNotificationStore";

export const useGroupStore = create((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isGroupsLoading: false,
  isGroupMessagesLoading: false,

  // Get all groups for the current user
  getUserGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups/user-groups");
      set({ groups: res.data });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to fetch groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  // Get group details
  getGroupDetails: async (groupId) => {
    try {
      const res = await axiosInstance.get(`/groups/${groupId}`);
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to fetch group details");
      return null;
    }
  },

  // Create a new group
  createGroup: async (groupData) => {
    try {
      const res = await axiosInstance.post("/groups/create", groupData);
      set(state => ({ groups: [res.data, ...state.groups] }));
      toast.success("Group created successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create group");
      return null;
    }
  },

  // Join group by invite code
  joinGroupByInvite: async (inviteCode) => {
    try {
      const res = await axiosInstance.post("/groups/join", { inviteCode });
      set(state => ({ groups: [res.data, ...state.groups] }));
      toast.success("Joined group successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to join group");
      return null;
    }
  },

  // Add member to group
  addMemberToGroup: async (groupId, userTag) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/add-member`, { userTag });
      // Update the group in the list
      set(state => ({
        groups: state.groups.map(group => 
          group._id === groupId ? res.data : group
        )
      }));
      toast.success("Member added successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to add member");
      return null;
    }
  },

  // Remove member from group
  removeMemberFromGroup: async (groupId, memberId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}/remove-member/${memberId}`);
      // Update the group in the list
      set(state => ({
        groups: state.groups.map(group => 
          group._id === groupId 
            ? {
                ...group,
                members: group.members.filter(member => member.userId._id !== memberId)
              }
            : group
        )
      }));
      toast.success("Member removed successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to remove member");
    }
  },

  // Leave group
  leaveGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}/leave`);
      set(state => ({
        groups: state.groups.filter(group => group._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
      }));
      toast.success("Left group successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to leave group");
    }
  },

  // Update group details
  updateGroup: async (groupId, updateData) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}`, updateData);
      set(state => ({
        groups: state.groups.map(group => 
          group._id === groupId ? res.data : group
        ),
        selectedGroup: state.selectedGroup?._id === groupId ? res.data : state.selectedGroup
      }));
      toast.success("Group updated successfully");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update group");
      return null;
    }
  },

  // Delete group
  deleteGroup: async (groupId) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);
      set(state => ({
        groups: state.groups.filter(group => group._id !== groupId),
        selectedGroup: state.selectedGroup?._id === groupId ? null : state.selectedGroup
      }));
      toast.success("Group deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete group");
    }
  },

  // Get group messages
  getGroupMessages: async (groupId) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data });
      
      // Refresh groups to update unread counts
      get().getUserGroups();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to fetch messages");
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  // Send message to group
  sendGroupMessage: async (messageData) => {
    const { selectedGroup, groupMessages } = get();
    if (!selectedGroup) return;

    try {
      const res = await axiosInstance.post(`/groups/${selectedGroup._id}/send`, messageData);
      set({ groupMessages: [...groupMessages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to send message");
    }
  },

  // Subscribe to group messages
  subscribeToGroupMessages: () => {
    const { selectedGroup } = get();
    if (!selectedGroup) return;

    const socket = useAuthStore.getState().socket;
    
    console.log('🔔 Subscribing to group messages for group:', selectedGroup._id);
    console.log('🔔 Socket connected:', socket?.connected);

    // Listen for messages from the selected group only
    socket.on("newGroupMessage", (newMessage) => {
      console.log('🔔 Group newGroupMessage received:', newMessage);
      console.log('🔔 Message groupId:', newMessage.groupId);
      console.log('🔔 Selected group:', selectedGroup);
      
      const isMessageFromSelectedGroup = newMessage.groupId === selectedGroup._id;
      
      if (isMessageFromSelectedGroup) {
        console.log('🔔 Adding message to group chat');
        set(state => ({
          groupMessages: [...state.groupMessages, newMessage],
        }));
        
        // Refresh groups to update unread counts
        get().getUserGroups();
      }
    });

    socket.on("groupUpdate", (update) => {
      if (update.groupId === selectedGroup._id) {
        // Refresh group details and groups list
        get().getGroupDetails(selectedGroup._id).then(updatedGroup => {
          if (updatedGroup) {
            set({ selectedGroup: updatedGroup });
          }
        });
        get().getUserGroups();
      }
    });
  },

  // Unsubscribe from group messages
  unsubscribeFromGroupMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newGroupMessage");
    socket.off("groupUpdate");
  },

  // Set selected group
  setSelectedGroup: (selectedGroup) => set({ selectedGroup }),

  // Clear group messages
  clearGroupMessages: () => set({ groupMessages: [] }),

  // Get unread count for a specific group
  getGroupUnreadCount: (groupId) => {
    const group = get().groups.find(g => g._id === groupId);
    return group?.unreadCount || 0;
  },

  // Check if user is admin of a group
  isUserAdmin: (groupId) => {
    const { authUser } = useAuthStore.getState();
    const group = get().groups.find(g => g._id === groupId);
    return group?.admin._id === authUser._id;
  },

  // Check if user is member of a group
  isUserMember: (groupId) => {
    const { authUser } = useAuthStore.getState();
    const group = get().groups.find(g => g._id === groupId);
    return group?.members.some(member => 
      member.userId._id === authUser._id && member.isActive
    );
  },

  // Get user role in group
  getUserRole: (groupId) => {
    const { authUser } = useAuthStore.getState();
    const group = get().groups.find(g => g._id === groupId);
    if (!group) return null;
    
    if (group.admin._id === authUser._id) return "admin";
    
    const member = group.members.find(member => 
      member.userId._id === authUser._id && member.isActive
    );
    return member?.role || null;
  }
}));
