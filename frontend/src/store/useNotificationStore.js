import { create } from "zustand";
import { persist } from "zustand/middleware";
import notificationService from "../lib/notificationService";

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      // Notification settings
      notificationsEnabled: true,
      soundEnabled: true,
      desktopNotifications: true,
      
      // Notification data
      notifications: [],
      unreadCount: 0,
      
      // Initialize notification service
      initNotifications: async () => {
        console.log('🔔 Initializing notifications...');
        await notificationService.init();
        const settings = notificationService.getSettings();
        console.log('🔔 Notification settings:', settings);
        set({
          notificationsEnabled: settings.notificationsEnabled,
          soundEnabled: settings.soundEnabled,
          desktopNotifications: settings.permission === 'granted'
        });
        console.log('🔔 Notifications initialized with settings:', {
          notificationsEnabled: settings.notificationsEnabled,
          soundEnabled: settings.soundEnabled,
          desktopNotifications: settings.permission === 'granted'
        });
      },

      // Update notification settings
      updateNotificationSettings: (settings) => {
        set(settings);
        notificationService.updateSettings(settings);
      },

      // Add new notification
      addNotification: (notification) => {
        console.log('🔔 Adding notification:', notification);
        
        const newNotification = {
          id: Date.now() + Math.random(),
          timestamp: new Date(),
          read: false,
          ...notification
        };

        set(state => {
          const updatedNotifications = [newNotification, ...state.notifications].slice(0, 100);
          const unreadCount = updatedNotifications.filter(n => !n.read).length;
          
          console.log('🔔 Notification added, new unread count:', unreadCount);
          
          return {
            notifications: updatedNotifications,
            unreadCount: unreadCount
          };
        });

        console.log('🔔 Notification added to store');

        // Show toast notification
        if (notification.type === 'message') {
          console.log('🔔 Showing message notification');
          notificationService.showMessageNotification(
            notification.senderName,
            notification.message,
            notification.senderAvatar,
            notification.chatType
          );
        } else if (notification.type === 'group_message') {
          console.log('🔔 Showing group notification');
          notificationService.showGroupNotification(
            notification.groupName,
            notification.message,
            notification.senderName
          );
        } else if (notification.type === 'friend_request') {
          console.log('🔔 Showing friend request notification');
          notificationService.showFriendRequestNotification(
            notification.senderName,
            notification.senderAvatar
          );
        } else if (notification.type === 'group_invite') {
          console.log('🔔 Showing group invite notification');
          notificationService.showGroupInviteNotification(
            notification.groupName,
            notification.inviterName
          );
        }
      },

      // Mark notification as read
      markAsRead: (notificationId) => {
        set(state => {
          const updatedNotifications = state.notifications.map(notif =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          );
          const unreadCount = updatedNotifications.filter(n => !n.read).length;
          
          return {
            notifications: updatedNotifications,
            unreadCount: unreadCount
          };
        });
      },

      // Mark all notifications as read
      markAllAsRead: () => {
        set(state => {
          const updatedNotifications = state.notifications.map(notif => ({ ...notif, read: true }));
          
          return {
            notifications: updatedNotifications,
            unreadCount: 0
          };
        });
      },

      // Remove notification
      removeNotification: (notificationId) => {
        set(state => {
          const updatedNotifications = state.notifications.filter(n => n.id !== notificationId);
          const unreadCount = updatedNotifications.filter(n => !n.read).length;
          
          return {
            notifications: updatedNotifications,
            unreadCount: unreadCount
          };
        });
      },

      // Clear all notifications
      clearAllNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0
        });
        notificationService.clearAllNotifications();
      },

      // Get unread notifications
      getUnreadNotifications: () => {
        return get().notifications.filter(n => !n.read);
      },

      // Get recent notifications (last 24 hours)
      getRecentNotifications: () => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return get().notifications.filter(n => n.timestamp > oneDayAgo);
      },

      // Check if user should be notified (not in current chat)
      shouldNotify: async (senderId, targetChatId, chatType) => {
        // Import stores dynamically to avoid circular dependencies
        let selectedUser = null;
        let selectedGroup = null;
        
        try {
          const { useChatStore } = await import('./useChatStore');
          const { useGroupStore } = await import('./useGroupStore');
          selectedUser = useChatStore.getState().selectedUser;
          selectedGroup = useGroupStore.getState().selectedGroup;
        } catch (error) {
          console.log('🔔 Error accessing store states:', error);
          return true; // Default to showing notification if we can't check
        }
        
        console.log('🔔 Should notify check:', {
          senderId,
          targetChatId,
          chatType,
          selectedUser: selectedUser?._id,
          selectedGroup: selectedGroup?._id
        });
        
        if (chatType === 'direct') {
          // For direct messages, check if we're chatting with this sender
          const shouldNotify = !selectedUser || selectedUser._id !== senderId;
          console.log('🔔 Direct message should notify:', shouldNotify, {
            selectedUserId: selectedUser?._id,
            senderId
          });
          return shouldNotify;
        } else if (chatType === 'group') {
          // For group messages, check if we're viewing this group
          const shouldNotify = !selectedGroup || selectedGroup._id !== targetChatId;
          console.log('🔔 Group message should notify:', shouldNotify, {
            selectedGroupId: selectedGroup?._id,
            targetChatId
          });
          return shouldNotify;
        }
        
        return true;
      },
      
      // Get unread count for navbar badge
      calculateUnreadCount: () => {
        const unread = get().notifications.filter(n => !n.read).length;
        set({ unreadCount: unread });
        return unread;
      }
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        notificationsEnabled: state.notificationsEnabled,
        soundEnabled: state.soundEnabled,
        desktopNotifications: state.desktopNotifications
      })
    }
  )
);