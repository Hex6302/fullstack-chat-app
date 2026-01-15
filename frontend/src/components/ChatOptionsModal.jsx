import { useState, useEffect } from "react";
import { X, Timer, Trash2 } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const ChatOptionsModal = ({ isOpen, onClose, onEnableSelfDestruct }) => {
  const { selfDestructMode } = useChatStore();
  const [selfDestructEnabled, setSelfDestructEnabled] = useState(false);
  const [destructMode, setDestructMode] = useState("timer"); // "timer" or "read"
  const [timerValue, setTimerValue] = useState(30); // seconds

  // Update state when modal opens if self-destruct is already enabled
  useEffect(() => {
    if (isOpen && selfDestructMode.enabled) {
      setSelfDestructEnabled(true);
      setDestructMode(selfDestructMode.duration ? "timer" : "read");
      setTimerValue(selfDestructMode.duration || 30);
    }
  }, [isOpen, selfDestructMode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selfDestructEnabled) {
      onEnableSelfDestruct(destructMode === "timer" ? timerValue : null);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md chat-options-modal">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="text-lg font-semibold">Self-Destruct Mode</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Self-Destruct Messages */}
          <div className="border border-base-300 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Trash2 className="size-5 text-primary" />
              <h4 className="font-medium">Self-Destructing Messages</h4>
            </div>

            {/* Toggle */}
            <label className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-base-200">
              <span className="text-sm">Enable self-destruct mode</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={selfDestructEnabled}
                onChange={(e) => setSelfDestructEnabled(e.target.checked)}
              />
            </label>

            {selfDestructEnabled && (
              <div className="space-y-3 pt-2 border-t border-base-300 animate-fadeIn">
                {/* Mode Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Destruct Mode:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`flex-1 btn btn-sm ${
                        destructMode === "timer"
                          ? "btn-primary"
                          : "btn-outline"
                      }`}
                      onClick={() => setDestructMode("timer")}
                    >
                      <Timer className="size-4" />
                      Timer
                    </button>
                    <button
                      type="button"
                      className={`flex-1 btn btn-sm ${
                        destructMode === "read"
                          ? "btn-primary"
                          : "btn-outline"
                      }`}
                      onClick={() => setDestructMode("read")}
                    >
                      <X className="size-4" />
                      On Read
                    </button>
                  </div>
                </div>

                {/* Timer Options */}
                {destructMode === "timer" && (
                  <div className="space-y-2 animate-fadeIn">
                    <label className="text-sm font-medium">
                      Auto-destruct after:
                    </label>
                    <select
                      value={timerValue}
                      onChange={(e) => setTimerValue(Number(e.target.value))}
                      className="select select-bordered w-full"
                    >
                      <option value={5}>5 seconds</option>
                      <option value={10}>10 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={60}>1 minute</option>
                      <option value={300}>5 minutes</option>
                      <option value={600}>10 minutes</option>
                      <option value={3600}>1 hour</option>
                    </select>
                  </div>
                )}

                {/* Info */}
                <div className="alert alert-info">
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
                    ></path>
                  </svg>
                  <span className="text-xs">
                    {destructMode === "timer"
                      ? `Messages will automatically delete after ${timerValue} seconds`
                      : "Messages will delete once read"}
                  </span>
                </div>
              </div>
            )}
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

export default ChatOptionsModal;
