import { useState } from "react";
import { X, Search, Users, Lock, Globe } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";

const JoinGroupModal = ({ onClose, onSuccess }) => {
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { joinGroupByInvite } = useGroupStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsLoading(true);
    try {
      const group = await joinGroupByInvite(inviteCode.trim().toUpperCase());
      if (group) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error joining group:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Search className="size-5" />
            Join Group
          </h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="label">
              <span className="label-text">Invite Code</span>
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character invite code"
              className="input input-bordered w-full text-center text-lg font-mono tracking-widest"
              maxLength={6}
              required
            />
            <div className="label">
              <span className="label-text-alt">
                Ask a group member for the invite code
              </span>
            </div>
          </div>

          <div className="bg-base-200 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-base-content/70 mb-2">
              <Users className="size-4" />
              <span>How to get an invite code:</span>
            </div>
            <ul className="text-sm text-base-content/70 space-y-1">
              <li>• Ask a group member to share the invite code</li>
              <li>• Group admins can generate new invite codes</li>
              <li>• Invite codes are 6 characters long</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!inviteCode.trim() || isLoading}
              className="btn btn-primary flex-1"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <Users className="size-4" />
                  Join Group
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinGroupModal;

