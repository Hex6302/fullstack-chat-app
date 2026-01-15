import { toast } from 'react-toastify';

// Notification Service for WhatsApp-like notifications using react-toastify
class NotificationService {
  constructor() {
    this.permission = null;
    this.isSupported = 'Notification' in window;
    this.soundEnabled = true;
    this.notificationsEnabled = true;
    this.init();
  }

  async init() {
    console.log('🔔 Initializing notification service...');
    console.log('🔔 Notification supported:', this.isSupported);
    
    if (this.isSupported) {
      this.permission = Notification.permission;
      console.log('🔔 Current permission:', this.permission);
      
      // Request permission if not already granted
      if (this.permission === 'default') {
        console.log('🔔 Requesting notification permission...');
        this.permission = await Notification.requestPermission();
        console.log('🔔 Permission granted:', this.permission);
      }
    } else {
      console.log('🔔 Notifications not supported in this browser');
    }
  }

  // Check if notifications are supported and allowed
  canNotify() {
    const canNotify = this.notificationsEnabled;
    
    console.log('🔔 Can notify check:', {
      notificationsEnabled: this.notificationsEnabled,
      canNotify
    });
    
    return canNotify;
  }

  // Show toast notification
  showNotification(title, options = {}) {
    console.log('🔔 Attempting to show notification:', title, options);
    
    if (!this.canNotify()) {
      console.log('🔔 Cannot notify - settings issue');
      return null;
    }

    // Play sound if enabled
    if (this.soundEnabled) {
      this.playNotificationSound();
    }

    // Show toast notification with modern styling
    const toastOptions = {
      position: "top-right",
      autoClose: 6000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      className: 'modern-toast',
      bodyClassName: 'modern-toast-body',
      progressClassName: 'modern-toast-progress',
      ...options
    };

    console.log('🔔 Creating toast notification with options:', toastOptions);

    try {
      const toastId = toast(title, toastOptions);
      console.log('🔔 Toast notification created successfully');
      return toastId;
    } catch (error) {
      console.error('🔔 Error creating toast notification:', error);
      return null;
    }
  }

  // Show message notification
  showMessageNotification(senderName, messageText, senderAvatar, chatType = 'direct') {
    const title = chatType === 'group' ? `${senderName} in a group` : senderName;
    const body = messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText;
    
    return this.showNotification(`💬 ${title}: ${body}`, {
      type: 'info',
      toastId: `message-${Date.now()}`,
      className: 'modern-toast message-toast',
    });
  }

  // Show group notification
  showGroupNotification(groupName, messageText, senderName) {
    const body = messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText;
    return this.showNotification(`👥 ${senderName} in ${groupName}: ${body}`, {
      type: 'info',
      toastId: `group-${Date.now()}`,
      className: 'modern-toast group-toast',
    });
  }

  // Show friend request notification
  showFriendRequestNotification(senderName, senderAvatar) {
    return this.showNotification(`👤 New Friend Request: ${senderName} sent you a friend request`, {
      type: 'success',
      toastId: `friend-request-${Date.now()}`,
      className: 'modern-toast friend-request-toast',
    });
  }

  // Show group invite notification
  showGroupInviteNotification(groupName, inviterName) {
    return this.showNotification(`📨 Group Invitation: ${inviterName} invited you to join ${groupName}`, {
      type: 'info',
      toastId: `group-invite-${Date.now()}`,
      className: 'modern-toast group-invite-toast',
    });
  }

  // Play notification sound
  playNotificationSound() {
    if (!this.soundEnabled) return;

    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create a simple beep sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }

  // Update notification settings
  updateSettings(settings) {
    this.notificationsEnabled = settings.notificationsEnabled !== false;
    this.soundEnabled = settings.soundEnabled !== false;
  }

  // Get current settings
  getSettings() {
    return {
      notificationsEnabled: this.notificationsEnabled,
      soundEnabled: this.soundEnabled,
      permission: this.permission,
      isSupported: this.isSupported
    };
  }

  // Clear all notifications
  clearAllNotifications() {
    if (this.isSupported && this.permission === 'granted') {
      // Note: There's no direct way to clear all notifications
      // This is a placeholder for future implementation
      console.log('Clearing all notifications...');
    }
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
