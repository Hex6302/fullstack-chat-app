import { useState, useRef, useEffect, memo, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatMessageTime } from "../lib/utils";
import { Check, CheckCheck, Share2, MoreVertical } from "lucide-react";
import ProtectedMessage from "./ProtectedMessage";

const Message = memo(({ message, isSelecting, isSelected, onSelect, onForward }) => {
  const { authUser } = useAuthStore();
  const { isMessageDeleting } = useChatStore();
  const isMyMessage = message.senderId === authUser._id;
  const isDeleting = isMessageDeleting(message._id);
  const [showForwardMenu, setShowForwardMenu] = useState(false);
  const longPressTimer = useRef(null);
  const messageRef = useRef(null);

  // Long press handler for forward
  const handleTouchStart = (e) => {
    if (message.preventForwarding || isSelecting) return;
    
    longPressTimer.current = setTimeout(() => {
      if (onForward) {
        onForward(message);
      }
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // Prevent long press on text selection (mobile)
  const handleContextMenu = (e) => {
    if (message.preventForwarding || message.disableCopy) {
      e.preventDefault();
      return false;
    }
  };

  useEffect(() => {
    const element = messageRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('contextmenu', handleContextMenu);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [message.preventForwarding, message.disableCopy, onForward]);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  const handleClick = useCallback(() => {
    if (isSelecting && onSelect) {
      onSelect();
    }
  }, [isSelecting, onSelect]);

  const handleForwardClick = useCallback(() => {
    if (onForward && !message.preventForwarding) {
      onForward(message);
    }
  }, [onForward, message]);

  return (
    <div 
      ref={messageRef}
      className={`flex group ${isMyMessage ? "justify-end" : "justify-start"} ${
        isSelecting ? "cursor-pointer" : ""
      } ${isDeleting ? "message-deleting" : ""} ${
        message.preventForwarding ? "no-context-menu" : ""
      }`}
      onClick={handleClick}
    >
      <div className={`flex gap-2 items-start w-full max-w-[85%] ${
        isSelecting ? "hover:bg-base-200 p-2 rounded-lg" : ""
      }`}>
        {isSelecting && (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="checkbox checkbox-sm"
            />
          </div>
        )}
        <div className={`flex flex-col gap-1 w-full ${
          isMyMessage ? "items-end" : "items-start"
        }`}>
          <div className={`flex items-center gap-1 w-full ${
            isMyMessage ? "flex-row-reverse" : ""
          }`}>
            <div className={`flex flex-col gap-1 w-full ${
              isMyMessage ? "items-end" : "items-start"
            }`}>
              {message.image && (
                <ProtectedMessage
                  message={message}
                  isMyMessage={isMyMessage}
                  preventForwarding={message.preventForwarding}
                  disableCopy={message.disableCopy}
                >
                  <div className="rounded-xl overflow-hidden">
                    {message.isForwarded && (
                      <div className="text-[10px] opacity-60 bg-base-300/50 px-2 py-1 rounded-t-lg">
                        📤 Forwarded
                      </div>
                    )}
                    <img 
                      src={message.image} 
                      alt="message" 
                      className="max-w-[200px] max-h-[200px] object-cover"
                    />
                  </div>
                </ProtectedMessage>
              )}
              {message.text && (
                <ProtectedMessage
                  message={message}
                  isMyMessage={isMyMessage}
                  preventForwarding={message.preventForwarding}
                  disableCopy={message.disableCopy}
                >
                  {message.isForwarded && (
                    <div className="text-[10px] opacity-60 bg-base-300/50 px-2 py-1 rounded-t-lg">
                      📤 Forwarded
                    </div>
                  )}
                  <div className={`px-4 py-2 rounded-2xl max-w-full ${
                    isMyMessage 
                      ? "bg-primary text-primary-content rounded-tr-none" 
                      : "bg-base-200 rounded-tl-none"
                  }`}>
                    <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
                  </div>
                </ProtectedMessage>
              )}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] opacity-50">
                  <span>{formatMessageTime(message.createdAt)}</span>
                  {isMyMessage && (
                    <span className="flex items-center">
                      {message.status === "read" ? (
                        <CheckCheck className="size-3" />
                      ) : message.status === "delivered" ? (
                        <Check className="size-3" />
                      ) : null}
                    </span>
                  )}
                </div>
                
                {/* Forward button - only show if not protected and not in selection mode */}
                {!isSelecting && !message.preventForwarding && (
                  <>
                    <button
                      onClick={handleForwardClick}
                      className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
                      title="Forward message"
                    >
                      <Share2 className="size-3" />
                    </button>
                    {/* Mobile: show always for touch */}
                    <button
                      onClick={handleForwardClick}
                      className="btn btn-ghost btn-xs flex sm:hidden"
                      title="Tap and hold or click to forward"
                    >
                      <Share2 className="size-3" />
                    </button>
                  </>
                )}
                
                {/* Show lock icon if prevented */}
                {message.preventForwarding && (
                  <div className="tooltip" data-tip="Forwarding disabled for this message">
                    <Share2 className="size-3 opacity-30" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo
  return (
    prevProps.message._id === nextProps.message._id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.isSelecting === nextProps.isSelecting &&
    prevProps.isSelected === nextProps.isSelected
  );
});

Message.displayName = 'Message';

export default Message; 