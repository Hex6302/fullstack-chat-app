import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useNotificationStore } from "../store/useNotificationStore";

// Get useNotificationStore instance for logging
const { getState } = useNotificationStore;
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { MessageSquare, Settings, User, Hash, Copy, Check, Bell } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import NotificationCenter from "./NotificationCenter";

const Navbar = () => {
  const { authUser } = useAuthStore();
  const { unreadCount, addNotification } = useNotificationStore();
  const { users } = useChatStore();
  const { groups } = useGroupStore();
  const [copiedUserTag, setCopiedUserTag] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  
  // Calculate total message count (private + group)
  const totalMessageCount = users.reduce((sum, user) => sum + (user.unreadCount || 0), 0) + 
                            groups.reduce((sum, group) => sum + (group.unreadCount || 0), 0);

  const copyUserTag = () => {
    navigator.clipboard.writeText(authUser.userTag);
    setCopiedUserTag(true);
    toast.success("User ID copied!");
    setTimeout(() => setCopiedUserTag(false), 2000);
  };



  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 
    backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all relative group">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center relative">
                <MessageSquare className="w-5 h-5 text-primary" />
                {totalMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold shadow-lg group-hover:animate-pulse">
                    {totalMessageCount > 9 ? '9+' : totalMessageCount}
                  </span>
                )}
              </div>
              <h1 className="text-lg font-bold">HexChat</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {authUser && (
              <div className="hidden md:flex items-center gap-2 bg-gradient-to-r from-base-200 to-base-300 px-3 py-1.5 rounded-xl border border-base-300 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Hash className="size-3 text-primary-content" />
                  </div>
                  <span className="font-mono text-sm font-bold text-base-content">{authUser.userTag}</span>
                </div>
                <button
                  onClick={copyUserTag}
                  className="btn btn-ghost btn-xs btn-circle hover:bg-primary/20 transition-all duration-200 group"
                  title="Copy User ID"
                >
                  {copiedUserTag ? (
                    <Check className="size-3 text-success group-hover:scale-110 transition-transform duration-200" />
                  ) : (
                    <Copy className="size-3 group-hover:scale-110 transition-transform duration-200" />
                  )}
                </button>
              </div>
            )}

            {authUser && (
              <div className="relative">
                <button
                  onClick={() => {
                    console.log('🔔 Bell clicked, unreadCount:', unreadCount);
                    const state = getState();
                    console.log('🔔 Notifications:', state.notifications);
                    console.log('🔔 Unread count:', state.unreadCount);
                    setShowNotificationCenter(true);
                  }}
                  className="btn btn-ghost btn-sm btn-circle relative group hover:bg-primary/10 transition-all duration-200"
                  title="Notifications"
                >
                  <Bell className="size-4 group-hover:scale-110 transition-transform duration-200" />
                </button>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold shadow-lg animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            )}
            
            <Link
              to={"/settings"}
              className={`
              btn btn-sm gap-2 transition-colors
              
              `}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {authUser && (
              <Link to={"/profile"} className={`btn btn-sm gap-2`}>
                <User className="size-5" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Notification Center */}
      <NotificationCenter 
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />
    </header>
  );
};
export default Navbar;
