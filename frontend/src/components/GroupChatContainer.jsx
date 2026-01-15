import { useGroupStore } from "../store/useGroupStore";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MoreVertical, Settings, Users, UserPlus, Crown, Shield, UserMinus, X, Trash2, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getOnlineStatusDot } from "../lib/onlineStatus.jsx";

import GroupMessageInput from "./GroupMessageInput";
import GroupMessage from "./GroupMessage";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const GroupChatContainer = () => {
  const {
    groupMessages,
    getGroupMessages,
    isGroupMessagesLoading,
    selectedGroup,
    setSelectedGroup,
    subscribeToGroupMessages,
    unsubscribeFromGroupMessages,
    isUserAdmin,
    getUserRole,
    removeMemberFromGroup,
  } = useGroupStore();
  
  const { authUser, onlineUsers, joinGroupRoom, leaveGroupRoom } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedGroup) {
      getGroupMessages(selectedGroup._id);
      subscribeToGroupMessages();
      joinGroupRoom(selectedGroup._id);
    }
    return () => {
      unsubscribeFromGroupMessages();
      if (selectedGroup) {
        leaveGroupRoom(selectedGroup._id);
      }
    };
  }, [selectedGroup?._id, getGroupMessages, subscribeToGroupMessages, unsubscribeFromGroupMessages, joinGroupRoom, leaveGroupRoom]);

  useEffect(() => {
    if (messageEndRef.current && groupMessages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [groupMessages]);

  const handleSettings = () => {
    navigate("/settings");
    setShowOptions(false);
  };

  const toggleMessageSelection = (messageId) => {
    setSelectedMessages(prev => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId);
      } else {
        return [...prev, messageId];
      }
    });
  };

  // Close options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showOptions && !event.target.closest('.options-menu')) {
        setShowOptions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showOptions]);

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return <Crown className="size-3 text-yellow-500" />;
      case "moderator":
        return <Shield className="size-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const getOnlineMembersCount = () => {
    if (!selectedGroup) return 0;
    return selectedGroup.members.filter(member => 
      member.isActive && onlineUsers.includes(member.userId._id)
    ).length;
  };

  if (isGroupMessagesLoading) {
    return (
      <div className="fixed inset-0 flex flex-col">
        <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300 p-3 sm:p-4">
          <button 
            onClick={() => setSelectedGroup(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="size-4 sm:size-6" />
            <span className="text-sm sm:text-base">Back to chats</span>
          </button>
        </div>
        <MessageSkeleton />
        <GroupMessageInput />
      </div>
    );
  }

  if (!selectedGroup) return null;

  const userRole = getUserRole(selectedGroup._id);
  const isAdmin = isUserAdmin(selectedGroup._id);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300 flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedGroup(null);
              setSelectedMessages([]);
              setIsSelecting(false);
            }}
            className="btn btn-ghost btn-sm md:hidden"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="avatar">
                <div className="w-10 h-10 rounded-full">
                  <img 
                    src={selectedGroup.profilePic || "/avatar.png"} 
                    alt="group avatar" 
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-semibold">{selectedGroup.name}</span>
                  {selectedGroup.isPrivate && (
                    <span className="text-xs bg-base-300 px-1 rounded">Private</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-base-content/70">
                  <span>{getOnlineMembersCount()} online</span>
                  <span>•</span>
                  <span>{selectedGroup.members.filter(m => m.isActive).length} members</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Options Menu */}
        <div className="flex items-center gap-2">
          {isSelecting && (
            <div className="flex items-center gap-2 bg-base-200 px-3 py-1.5 rounded-lg">
              <span className="text-sm font-medium">{selectedMessages.length} selected</span>
              <div className="h-4 w-px bg-base-300"></div>
              <button
                onClick={() => {
                  setSelectedMessages([]);
                  setIsSelecting(false);
                }}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
          
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="btn btn-ghost btn-sm"
          >
            <Users className="size-4" />
          </button>
          
          <button
            onClick={() => navigate(`/group-profile/${selectedGroup._id}`)}
            className="btn btn-ghost btn-sm"
            title="Group Info"
          >
            <Info className="size-4" />
          </button>
          
          <div className="relative options-menu">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="btn btn-ghost btn-sm"
            >
              <MoreVertical className="size-4" />
            </button>
            
            {showOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-base-100 rounded-lg shadow-lg border border-base-300 z-50">
                <ul className="py-1">
                  <li>
                    <button
                      onClick={() => {
                        setIsSelecting(true);
                        setShowOptions(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-base-200 flex items-center gap-2"
                    >
                      <Trash2 className="size-4" />
                      <span>Select Messages to Delete</span>
                    </button>
                  </li>
                  {isAdmin && (
                    <li>
                      <button
                        onClick={handleSettings}
                        className="w-full px-4 py-2 text-left hover:bg-base-200 flex items-center gap-2"
                      >
                        <Settings className="size-4" />
                        <span>Group Settings</span>
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Members Panel */}
      {showMembers && (
        <div className="bg-base-200 border-b border-base-300 p-4 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Members ({selectedGroup.members.filter(m => m.isActive).length})</h3>
            <button
              onClick={() => setShowMembers(false)}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {selectedGroup.members
              .filter(member => member.isActive)
              .map((member) => (
                <div key={member.userId._id} className="flex items-center justify-between p-2 bg-base-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="avatar">
                      <div className="w-8 h-8 rounded-full">
                        <img src={member.userId.profilePic} alt="avatar" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{member.userId.fullName}</span>
                      {getRoleIcon(member.role)}
                    </div>
                    {getOnlineStatusDot(
                      onlineUsers.includes(member.userId._id),
                      false // Groups don't show "recently offline" status
                    )}
                  </div>
                  {isAdmin && member.userId._id !== authUser._id && (
                    <button
                      onClick={() => removeMemberFromGroup(selectedGroup._id, member.userId._id)}
                      className="btn btn-error btn-sm btn-circle"
                    >
                      <UserMinus className="size-3" />
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 bg-base-100 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100"
      >
        {groupMessages.map((message) => (
          <GroupMessage 
            key={message._id} 
            message={message} 
            isSelecting={isSelecting}
            isSelected={selectedMessages.includes(message._id)}
            onSelect={() => toggleMessageSelection(message._id)}
          />
        ))}
        <div ref={messageEndRef} />
      </div>

      <div className="sticky bottom-0 z-10 bg-base-100 p-3 border-t border-base-300">
        <GroupMessageInput />
      </div>
    </div>
  );
};

export default GroupChatContainer;
