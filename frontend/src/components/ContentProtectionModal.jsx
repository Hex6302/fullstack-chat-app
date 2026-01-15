import { useState, useEffect } from "react";
import { X, Shield, Lock } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const ContentProtectionModal = ({ isOpen, onClose }) => {
  const { protectMode, setProtectMode } = useChatStore();
  const [forwardProtection, setForwardProtection] = useState(false);
  const [copyProtection, setCopyProtection] = useState(false);

  // Update state when modal opens
  useEffect(() => {
    if (isOpen && protectMode.chatId) {
      setForwardProtection(protectMode.preventForwarding);
      setCopyProtection(protectMode.disableCopy);
    }
  }, [isOpen, protectMode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Apply protection settings
    setProtectMode({
      preventForwarding: forwardProtection,
      disableCopy: copyProtection,
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md chat-options-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center gap-2">
            <Lock className="size-5 text-primary" />
            <h3 className="text-lg font-semibold">Content Protection</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Prevent Forwarding */}
          <div className="border border-base-300 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="size-5 text-primary" />
              <h4 className="font-medium">Security Features</h4>
            </div>

            <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-base-200">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                <span className="text-sm font-medium">Prevent Forwarding</span>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={forwardProtection}
                onChange={(e) => setForwardProtection(e.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-base-200">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-primary" />
                <span className="text-sm font-medium">Disable Copy/Paste</span>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={copyProtection}
                onChange={(e) => setCopyProtection(e.target.checked)}
              />
            </label>

            {/* Info */}
            <div className="alert alert-info mt-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xs">
                Protected messages cannot be forwarded, copied, or shared
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContentProtectionModal;

