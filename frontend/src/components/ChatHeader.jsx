import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useEffect, useState } from "react";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers, isRecentlyOffline, getLastSeenTime } = useAuthStore();
  const [forceUpdate, setForceUpdate] = useState(0);

  // Add useEffect for periodic updates
  useEffect(() => {
    const interval = setInterval(() => {
      setForceUpdate(prev => prev + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const isOnline = onlineUsers.includes(selectedUser._id);
  const lastSeen = getLastSeenTime(selectedUser._id);
  const isRecentlyOfflineUser = !isOnline && isRecentlyOffline(selectedUser._id);

  return (
    <div className="p-2 sm:p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-8 sm:size-10 rounded-full relative">
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium text-sm sm:text-base">{selectedUser.fullName}</h3>
            <p className="text-xs sm:text-sm text-base-content/70 flex items-center gap-1 sm:gap-2">
              <span className="text-base-content/60">#{selectedUser.userTag}</span>
              {isOnline ? (
                <>
                  <span className="size-1.5 sm:size-2 bg-green-500 rounded-full" />
                  Online
                </>
              ) : isRecentlyOfflineUser ? (
                <>
                  <span className="size-1.5 sm:size-2 bg-blue-500 rounded-full" />
                  Recently offline
                </>
              ) : (
                <>
                  <span className="size-1.5 sm:size-2 bg-red-500 rounded-full" />
                  Offline
                </>
              )}
            </p>
          </div>
        </div>

        {/* Close button */}
        <button onClick={() => setSelectedUser(null)} className="btn btn-ghost btn-sm btn-circle">
          <X className="size-4 sm:size-5" />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;
