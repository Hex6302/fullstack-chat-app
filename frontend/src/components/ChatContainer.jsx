import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { ArrowLeft, Check, CheckCheck, MoreVertical, Settings, Trash2, MessageSquareX, X, Shield, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getOnlineStatusDot } from "../lib/onlineStatus.jsx";
import { Virtuoso } from "react-virtuoso";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import ChatOptionsModal from "./ChatOptionsModal";
import ContentProtectionModal from "./ContentProtectionModal";
import ForwardMessageModal from "./ForwardMessageModal";
import MessageSearchModal from "./MessageSearchModal";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import Message from "./Message";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    setSelectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteChat,
    clearChat,
    enableSelfDestructMode,
    selfDestructMode,
    isMessageDeleting,
    protectMode,
    setProtectMode,
  } = useChatStore();
  const { authUser, isUserTyping, onlineUsers, isRecentlyOffline } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showContentProtection, setShowContentProtection] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  // Memoize callbacks to prevent re-renders
  const handleToggleSelection = useCallback((messageId) => {
    toggleMessageSelection(messageId);
  }, []);

  const handleForward = useCallback((msg) => {
    if (!msg.preventForwarding) {
      setMessageToForward(msg);
      setShowForwardModal(true);
    }
  }, []);

  // Memoize messages list for virtualization
  const messagesList = useMemo(() => messages, [messages]);

  const handleClearChat = async () => {
    if (window.confirm("Are you sure you want to clear this chat?")) {
      await clearChat(selectedUser._id);
      setShowOptions(false);
    }
  };

  const handleDeleteSelectedMessages = async () => {
    if (selectedMessages.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedMessages.length} message(s)?`)) {
      try {
        await Promise.all(selectedMessages.map(messageId => 
          deleteChat(selectedUser._id, messageId)
        ));
        setSelectedMessages([]);
        setIsSelecting(false);
      } catch (error) {
        console.error("Error deleting messages:", error);
      }
    }
  };

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

  const getStatusDot = () => {
    const isOnline = onlineUsers.includes(selectedUser._id);
    const recentlyOffline = isRecentlyOffline(selectedUser._id);
    return getOnlineStatusDot(isOnline, recentlyOffline);
  };

  if (isMessagesLoading) {
    return (
      <div className="fixed inset-0 flex flex-col">
        <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300 p-3 sm:p-4">
          <button 
            onClick={() => setSelectedUser(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="size-4 sm:size-6" />
            <span className="text-sm sm:text-base">Back to chats</span>
          </button>
        </div>
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  if (!selectedUser) return null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300 flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedUser(null);
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
                  <img src={selectedUser.profilePic} alt="avatar" />
                </div>
              </div>
              <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{selectedUser.fullName}</span>
                  {selfDestructMode.enabled && selfDestructMode.chatId === selectedUser._id && (
                    <span className="badge badge-warning badge-sm">
                      🛡️ Self-Destruct {selfDestructMode.duration ? `${selfDestructMode.duration}s` : 'On Read'}
                    </span>
                  )}
                  {protectMode.chatId === selectedUser._id && (protectMode.preventForwarding || protectMode.disableCopy || protectMode.watermarked) && (
                    <span className="badge badge-error badge-sm">
                      🔒 Protected
                    </span>
                  )}
                </div>
                {isUserTyping(selectedUser._id) && (
                  <div className="flex items-center gap-1 text-xs text-base-content/70">
                    <span>typing</span>
                    <span className="flex gap-1">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>.</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
            {getOnlineStatusDot(
              onlineUsers.includes(selectedUser._id),
              isRecentlyOffline(selectedUser._id)
            )}
          </div>
        </div>

        {/* Options Menu */}
        <div className="flex items-center gap-2">
          {isSelecting && (
            <div className="flex items-center gap-2 bg-base-200 px-3 py-1.5 rounded-lg">
              <span className="text-sm font-medium">{selectedMessages.length} selected</span>
              <div className="h-4 w-px bg-base-300"></div>
              <button
                onClick={handleDeleteSelectedMessages}
                className="btn btn-error btn-sm btn-circle"
                disabled={selectedMessages.length === 0}
              >
                <Trash2 className="size-4" />
              </button>
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
                  <li>
                    <button
                      onClick={handleClearChat}
                      className="w-full px-4 py-2 text-left hover:bg-base-200 flex items-center gap-2"
                    >
                      <MessageSquareX className="size-4" />
                      <span>Clear Chat</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setShowSearchModal(true);
                        setShowOptions(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-base-200 flex items-center gap-2"
                    >
                      <MessageSquareX className="size-4" />
                      <span>Search Messages</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setShowChatOptions(true);
                        setShowOptions(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-base-200 flex items-center gap-2"
                    >
                      <Trash2 className="size-4" />
                      <span>Self-Destruct Mode</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        setShowContentProtection(true);
                        setShowOptions(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-base-200 flex items-center gap-2"
                    >
                      <Lock className="size-4" />
                      <span>Content Protection</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleSettings}
                      className="w-full px-4 py-2 text-left hover:bg-base-200 flex items-center gap-2"
                    >
                      <Settings className="size-4" />
                      <span>Settings</span>
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-hidden bg-base-100"
      >
        <Virtuoso
          data={messagesList}
          totalCount={messagesList.length}
          itemContent={(index) => {
            const message = messagesList[index];
            return (
              <div className="px-4 py-1.5">
                <Message 
                  key={message._id} 
                  message={message} 
                  isSelecting={isSelecting}
                  isSelected={selectedMessages.includes(message._id)}
                  onSelect={() => handleToggleSelection(message._id)}
                  onForward={handleForward}
                />
              </div>
            );
          }}
          followOutput="smooth"
          initialTopMostItemIndex={messagesList.length > 0 ? messagesList.length - 1 : 0}
          style={{ height: '100%' }}
        />
      </div>

      <div className="sticky bottom-0 z-10 bg-base-100 p-3 border-t border-base-300">
        <MessageInput />
      </div>

      {/* Chat Options Modal */}
      <ChatOptionsModal
        isOpen={showChatOptions}
        onClose={() => setShowChatOptions(false)}
        onEnableSelfDestruct={enableSelfDestructMode}
      />

      {/* Content Protection Modal */}
      <ContentProtectionModal
        isOpen={showContentProtection}
        onClose={() => setShowContentProtection(false)}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setMessageToForward(null);
        }}
        message={messageToForward}
      />

      {/* Message Search Modal */}
      <MessageSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        chatId={selectedUser?._id}
        chatType="direct"
      />
    </div>
  );
};

export default ChatContainer;

