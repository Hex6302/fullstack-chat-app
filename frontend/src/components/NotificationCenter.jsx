import { useState, useEffect } from "react";
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  MessageSquare, 
  Users, 
  UserPlus, 
  Settings,
  Volume2,
  VolumeX
} from "lucide-react";
import { useNotificationStore } from "../store/useNotificationStore";
import { formatDistanceToNow } from "date-fns";

const NotificationCenter = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState("unread");
  
  const {
    notifications,
    unreadCount,
    notificationsEnabled,
    soundEnabled,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    updateNotificationSettings,
    getUnreadNotifications,
    getRecentNotifications
  } = useNotificationStore();

  const filteredNotifications = activeTab === "unread" 
    ? getUnreadNotifications()
    : activeTab === "recent"
    ? getRecentNotifications()
    : notifications;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="size-4 text-blue-500" />;
      case 'group_message':
        return <Users className="size-4 text-green-500" />;
      case 'friend_request':
        return <UserPlus className="size-4 text-purple-500" />;
      case 'group_invite':
        return <Users className="size-4 text-orange-500" />;
      default:
        return <Bell className="size-4 text-gray-500" />;
    }
  };

  const getNotificationTitle = (notification) => {
    switch (notification.type) {
      case 'message':
        return notification.chatType === 'group' 
          ? `${notification.senderName} in a group`
          : notification.senderName;
      case 'group_message':
        return `${notification.senderName} in ${notification.groupName}`;
      case 'friend_request':
        return 'New Friend Request';
      case 'group_invite':
        return 'Group Invitation';
      default:
        return 'Notification';
    }
  };

  const getNotificationMessage = (notification) => {
    switch (notification.type) {
      case 'message':
      case 'group_message':
        return notification.message;
      case 'friend_request':
        return `${notification.senderName} sent you a friend request`;
      case 'group_invite':
        return `${notification.inviterName} invited you to join ${notification.groupName}`;
      default:
        return notification.message || 'You have a new notification';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-20">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-2xl max-h-[70vh] flex flex-col mt-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center gap-2">
            <Bell className="size-5" />
            <h3 className="text-lg font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-content text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Settings */}
        <div className="p-4 border-b border-base-300 bg-base-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => updateNotificationSettings({ 
                    notificationsEnabled: e.target.checked 
                  })}
                  className="toggle toggle-sm"
                />
                <span className="text-sm">Notifications</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => updateNotificationSettings({ 
                    soundEnabled: e.target.checked 
                  })}
                  className="toggle toggle-sm"
                />
                <span className="text-sm">Sound</span>
                {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="btn btn-ghost btn-sm"
              >
                <Check className="size-4" />
                Mark All Read
              </button>
              <button
                onClick={clearAllNotifications}
                className="btn btn-ghost btn-sm text-error"
              >
                <Trash2 className="size-4" />
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-base-300 bg-base-200">
          <button
            onClick={() => setActiveTab("unread")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === "unread"
                ? "bg-primary text-primary-content"
                : "text-base-content/70 hover:text-base-content hover:bg-base-200"
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("recent")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === "recent"
                ? "bg-primary text-primary-content"
                : "text-base-content/70 hover:text-base-content hover:bg-base-200"
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "bg-primary text-primary-content"
                : "text-base-content/70 hover:text-base-content hover:bg-base-200"
            }`}
          >
            All
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-base-content/50">
              <Bell className="size-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No notifications</p>
              <p className="text-sm">
                {activeTab === "unread" 
                  ? "You're all caught up!"
                  : "You'll see notifications here when you receive messages or friend requests."
                }
              </p>
            </div>
          ) : (
            <div className="p-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-base-200 ${
                    !notification.read ? "bg-primary/5 border-l-4 border-primary" : ""
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {getNotificationTitle(notification)}
                        </h4>
                        <p className="text-sm text-base-content/70 mt-1">
                          {getNotificationMessage(notification)}
                        </p>
                        <p className="text-xs text-base-content/50 mt-1">
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="btn btn-ghost btn-xs btn-circle"
                            title="Mark as read"
                          >
                            <Check className="size-3" />
                          </button>
                        )}
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="btn btn-ghost btn-xs btn-circle text-error"
                          title="Remove notification"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;

