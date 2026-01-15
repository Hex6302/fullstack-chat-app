import { useRef, useEffect, useCallback } from "react";
import { Lock } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const ProtectedMessage = ({ 
  message, 
  isMyMessage, 
  children,
  preventForwarding = false,
  disableCopy = false,
}) => {
  const { authUser } = useAuthStore();
  const messageRef = useRef(null);

  // Disable context menu (right-click)
  useEffect(() => {
    const element = messageRef.current;
    if (!element) return;

    const handleContextMenu = (e) => {
      if (preventForwarding || disableCopy) {
        e.preventDefault();
        e.stopPropagation();
        alert("🚫 This message is protected and cannot be copied or shared.");
        return false;
      }
    };

    element.addEventListener("contextmenu", handleContextMenu);
    return () => element.removeEventListener("contextmenu", handleContextMenu);
  }, [preventForwarding, disableCopy]);

  // Prevent mouse right-click context menu
  useEffect(() => {
    const element = messageRef.current;
    if (!element) return;

    const handleMouseDown = (e) => {
      if (preventForwarding || disableCopy) {
        if (e.button === 2) { // Right mouse button
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    element.addEventListener("mousedown", handleMouseDown);
    return () => element.removeEventListener("mousedown", handleMouseDown);
  }, [preventForwarding, disableCopy]);

  // Prevent text selection
  useEffect(() => {
    const element = messageRef.current;
    if (!element || !disableCopy) return;

    const handleSelectStart = (e) => {
      e.preventDefault();
      return false;
    };

    element.addEventListener("selectstart", handleSelectStart);
    element.style.userSelect = "none";
    element.style.webkitUserSelect = "none";

    return () => {
      element.removeEventListener("selectstart", handleSelectStart);
    };
  }, [disableCopy]);

  // Prevent copying via keyboard
  useEffect(() => {
    const element = messageRef.current;
    if (!element || !disableCopy) return;

    const handleCopy = (e) => {
      e.preventDefault();
      return false;
    };

    element.addEventListener("copy", handleCopy);
    element.addEventListener("cut", handleCopy);

    return () => {
      element.removeEventListener("copy", handleCopy);
      element.removeEventListener("cut", handleCopy);
    };
  }, [disableCopy]);

  return (
    <div 
      ref={messageRef}
      className="relative group protected-message-wrapper"
      style={{
        userSelect: disableCopy ? "none" : "text",
        WebkitUserSelect: disableCopy ? "none" : "text",
        WebkitTouchCallout: disableCopy ? "none" : "default",
        touchAction: preventForwarding ? "none" : "auto",
      }}
      onContextMenu={(e) => {
        if (preventForwarding || disableCopy) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {children}
      
      {/* Protection indicators */}
      {(preventForwarding || disableCopy) && (
        <div className={`absolute -top-2 ${isMyMessage ? '-left-2' : '-right-2'} z-10`}>
          <div className="bg-error/20 backdrop-blur-sm border border-error rounded-full p-1">
            <Lock className="size-3 text-error" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtectedMessage;

