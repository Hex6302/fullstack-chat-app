import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, UserPlus, MailCheck, MailX } from "lucide-react";
import { getOnlineStatusDot, getOnlineStatusText } from "../lib/onlineStatus.jsx";

const Sidebar = () => {
  const { getFriends, users, selectedUser, setSelectedUser, isUsersLoading, searchUserByTag, sendFriendRequest, getIncomingFriendRequests, acceptFriendRequest, rejectFriendRequest } = useChatStore();
  const { onlineUsers, isRecentlyOffline } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchTag, setSearchTag] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);

  useEffect(() => {
    getFriends();
    // Refresh user list every 30 seconds to keep unread counts updated
    const interval = setInterval(() => {
      getFriends();
    }, 30000);
    return () => clearInterval(interval);
  }, [getFriends]);

  useEffect(() => {
    if (showRequests) {
      getIncomingFriendRequests().then(setIncomingRequests);
    }
  }, [showRequests, getIncomingFriendRequests]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(searchTag)) return;
    const user = await searchUserByTag(searchTag);
    setSearchResult(user);
  };

  const handleSendRequest = async (userTag) => {
    await sendFriendRequest(userTag);
    setSearchResult(null);
  };

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  return (
    <div className="flex flex-col bg-base-100 rounded-lg shadow-lg">
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-5" />
            <span className="text-base font-semibold">Chats</span>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-xs"
            />
            <span className="text-xs">Online only</span>
          </label>
        </div>
        {/* Friend search */}
        <form className="mt-3 flex gap-2" onSubmit={handleSearch}>
          <input
            type="text"
            className="input input-bordered input-sm w-full max-w-[100px]"
            placeholder="4-digit ID"
            value={searchTag}
            maxLength={4}
            onChange={(e) => setSearchTag(e.target.value.replace(/[^\d]/g, ""))}
          />
          <button type="submit" className="btn btn-sm btn-primary">
            <UserPlus className="size-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>
        {searchResult && (
          <div className="mt-2 p-2 bg-base-200 rounded flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <img src={searchResult.profilePic || "/avatar.png"} alt="avatar" className="w-8 h-8 rounded-full" />
              <span className="font-medium text-sm">{searchResult.fullName} <span className="text-xs text-base-content/60">#{searchResult.userTag}</span></span>
            </div>
            <button className="btn btn-xs btn-success" onClick={() => handleSendRequest(searchResult.userTag)}>
              Send Request
            </button>
          </div>
        )}
        {/* Friend requests toggle */}
        <button className="btn btn-xs btn-outline mt-2 w-full" onClick={() => setShowRequests((v) => !v)}>
          {showRequests ? <MailX className="size-4" /> : <MailCheck className="size-4" />} Friend Requests
        </button>
        {showRequests && (
          <div className="mt-2 bg-base-200 rounded p-2 max-h-40 overflow-y-auto">
            {incomingRequests.length === 0 ? (
              <div className="text-xs text-base-content/60">No incoming requests</div>
            ) : (
              incomingRequests.map((req) => (
                <div key={req._id} className="flex items-center gap-2 justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <img src={req.sender.profilePic || "/avatar.png"} alt="avatar" className="w-7 h-7 rounded-full" />
                    <span className="font-medium text-xs">{req.sender.fullName} <span className="text-xs text-base-content/60">#{req.sender.userTag}</span></span>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-xs btn-success" onClick={() => acceptFriendRequest(req._id)}>
                      Accept
                    </button>
                    <button className="btn btn-xs btn-error" onClick={() => rejectFriendRequest(req._id)}>
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
        {isUsersLoading ? (
          <SidebarSkeleton />
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={
                `w-full p-3 flex items-center gap-3 border-b border-base-200
                hover:bg-base-200 transition-colors
                ${selectedUser?._id === user._id ? "bg-base-200" : ""}`
              }
            >
              <div className="flex-shrink-0 relative">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.name}
                  className="w-10 h-10 object-cover rounded-full"
                />
                {/* Unread count badge on avatar */}
                {user.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg">
                    {user.unreadCount > 9 ? "9+" : user.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm truncate">{user.fullName}</div>
                  <span className="text-xs text-base-content/60">#{user.userTag}</span>
                  <div className="flex-shrink-0">
                    {getOnlineStatusDot(
                      onlineUsers.includes(user._id),
                      isRecentlyOffline(user._id)
                    )}
                  </div>
                </div>
                <div className="text-xs text-base-content/60">
                  {getOnlineStatusText(
                    onlineUsers.includes(user._id),
                    isRecentlyOffline(user._id)
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="p-4 text-center text-base-content/60">
            No users found
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
