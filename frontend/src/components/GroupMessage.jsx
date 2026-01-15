import { useState } from "react";
import { formatMessageTime } from "../lib/utils";
import { useAuthStore } from "../store/useAuthStore";
import { Check, CheckCheck, MoreVertical, Reply, Trash2 } from "lucide-react";

const GroupMessage = ({ message, isSelecting, isSelected, onSelect }) => {
  const { authUser } = useAuthStore();
  const [showOptions, setShowOptions] = useState(false);
  const isMyMessage = message.senderId._id === authUser._id;

  const handleSelect = () => {
    if (isSelecting) {
      onSelect();
    }
  };

  const getReadStatus = () => {
    if (!isMyMessage) return null;
    
    const readCount = message.readBy?.length || 0;
    const totalMembers = message.groupId?.members?.filter(m => m.isActive).length || 0;
    
    if (readCount >= totalMembers) {
      return <CheckCheck className="size-3 text-blue-500" />;
    } else if (readCount > 1) {
      return <CheckCheck className="size-3 text-gray-400" />;
    } else {
      return <Check className="size-3 text-gray-400" />;
    }
  };

  const getReadCount = () => {
    if (!isMyMessage) return null;
    const readCount = message.readBy?.length || 0;
    return readCount > 1 ? `(${readCount})` : "";
  };

  return (
    <div
      className={`flex gap-2 group hover:bg-base-200/50 p-2 rounded-lg transition-colors ${
        isSelecting ? "cursor-pointer" : ""
      } ${isSelected ? "bg-primary/20" : ""}`}
      onClick={handleSelect}
    >
      {isSelecting && (
        <div className="flex items-start pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="checkbox checkbox-sm"
          />
        </div>
      )}
      
      {!isMyMessage && (
        <div className="flex-shrink-0">
          <div className="avatar">
            <div className="w-8 h-8 rounded-full">
              <img src={message.senderId.profilePic} alt="avatar" />
            </div>
          </div>
        </div>
      )}

      <div className={`flex-1 ${isMyMessage ? "flex flex-col items-end" : ""}`}>
        {!isMyMessage && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-base-content/80">
              {message.senderId.fullName}
            </span>
            <span className="text-xs text-base-content/50">
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
        )}

        <div
          className={`relative group/message ${
            isMyMessage
              ? "bg-primary text-primary-content rounded-2xl rounded-br-md"
              : "bg-base-200 text-base-content rounded-2xl rounded-bl-md"
          } px-4 py-2 max-w-xs sm:max-w-md lg:max-w-lg`}
        >
          {message.text && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.text}
            </p>
          )}
          
          {message.image && (
            <div className="mt-2">
              <img
                src={message.image}
                alt="message"
                className="max-w-full h-auto rounded-lg cursor-pointer"
                onClick={() => window.open(message.image, "_blank")}
              />
            </div>
          )}

          {message.replyTo && (
            <div className="mt-2 p-2 bg-base-100/50 rounded-lg border-l-2 border-primary">
              <div className="text-xs text-base-content/70 mb-1">
                Replying to {message.replyTo.senderId.fullName}
              </div>
              <div className="text-sm truncate">
                {message.replyTo.text || "Image"}
              </div>
            </div>
          )}

          {/* Message options */}
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover/message:opacity-100 transition-opacity">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptions(!showOptions);
                }}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <MoreVertical className="size-3" />
              </button>
              
              {showOptions && (
                <div className="absolute right-0 mt-1 w-32 bg-base-100 rounded-lg shadow-lg border border-base-300 z-50">
                  <ul className="py-1">
                    <li>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOptions(false);
                          // Handle reply functionality
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-base-200 flex items-center gap-2 text-sm"
                      >
                        <Reply className="size-3" />
                        <span>Reply</span>
                      </button>
                    </li>
                    {isMyMessage && (
                      <li>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowOptions(false);
                            // Handle delete functionality
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-base-200 flex items-center gap-2 text-sm text-error"
                        >
                          <Trash2 className="size-3" />
                          <span>Delete</span>
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {isMyMessage && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-base-content/50">
              {formatMessageTime(message.createdAt)}
            </span>
            {getReadStatus()}
            <span className="text-xs text-base-content/50">
              {getReadCount()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupMessage;

