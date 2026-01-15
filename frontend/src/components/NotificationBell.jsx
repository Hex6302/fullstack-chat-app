import { useState, useEffect } from "react";
import { Bell, X, Check, Trash2, Settings } from "lucide-react";
import { useNotificationStore } from "../store/useNotificationStore";
import { useAuthStore } from "../store/useAuthStore";

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } = useNotificationStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      getUserNotifications();
    }
  }, [isOpen, getUserNotifications]);

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markNotificationAsRead(notification._id);
    }
    
    // Handle navigation based on notification type
    if (notification.type === "new_message" && notification.data.messageId) {
      // Navigate to the message
      // This would be implemented based on your routing
    }
    
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "new_message":
        return "💬";
      case "member_joined":
        return "👋";
      case "member_left":
        return "👋";
      case "member_removed":
        return "❌";
      case "role_changed":
        return "👑";
      case "mention":
        return "📢";
      default:
        return "🔔";
    }
  };

  const getNotificationTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInMinutes = Math.floor((now - created) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-base-content hover:text-primary transition-colors"
        title="Notifications"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-error text-error-content text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-base-100 rounded-lg shadow-xl border border-base-300 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-base-300">
            <h3 className="font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                className="btn btn-xs btn-ghost"
                title="Mark all as read"
              >
                <Check className="size-3" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="btn btn-xs btn-ghost"
                title="Close"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 border-b border-base-200 cursor-pointer hover:bg-base-200 transition-colors ${
                    !notification.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-lg">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm truncate">
                          {notification.title}
                        </h4>
                        <button
                          onClick={(e) => handleDeleteNotification(e, notification._id)}
                          className="btn btn-xs btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete notification"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                      <p className="text-xs text-base-content/70 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-base-content/50">
                          {getNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-base-content/60">
                No notifications
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-base-300 bg-base-200">
              <button
                onClick={() => {/* Navigate to notifications page */}}
                className="btn btn-sm btn-outline w-full"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

