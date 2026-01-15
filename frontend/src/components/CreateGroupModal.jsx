import { useState } from "react";
import { X, Users, Lock, Globe, UserPlus } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";

const CreateGroupModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
    maxMembers: 100,
  });
  const [isLoading, setIsLoading] = useState(false);

  const { createGroup } = useGroupStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsLoading(true);
    try {
      const newGroup = await createGroup(formData);
      if (newGroup) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="size-5" />
            Create Group
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
              <span className="label-text">Group Name *</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter group name"
              className="input input-bordered w-full"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter group description (optional)"
              className="textarea textarea-bordered w-full"
              rows={3}
              maxLength={200}
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Privacy</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border border-base-300 rounded-lg cursor-pointer hover:bg-base-200">
                <input
                  type="radio"
                  name="isPrivate"
                  value={false}
                  checked={!formData.isPrivate}
                  onChange={handleChange}
                  className="radio radio-primary"
                />
                <div className="flex items-center gap-2">
                  <Globe className="size-4" />
                  <div>
                    <div className="font-medium">Public</div>
                    <div className="text-sm text-base-content/70">
                      Anyone can join with invite code
                    </div>
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-base-300 rounded-lg cursor-pointer hover:bg-base-200">
                <input
                  type="radio"
                  name="isPrivate"
                  value={true}
                  checked={formData.isPrivate}
                  onChange={handleChange}
                  className="radio radio-primary"
                />
                <div className="flex items-center gap-2">
                  <Lock className="size-4" />
                  <div>
                    <div className="font-medium">Private</div>
                    <div className="text-sm text-base-content/70">
                      Only invited members can join
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Max Members</span>
            </label>
            <select
              name="maxMembers"
              value={formData.maxMembers}
              onChange={handleChange}
              className="select select-bordered w-full"
            >
              <option value={50}>50 members</option>
              <option value={100}>100 members</option>
              <option value={200}>200 members</option>
              <option value={500}>500 members</option>
            </select>
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
              disabled={!formData.name.trim() || isLoading}
              className="btn btn-primary flex-1"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <UserPlus className="size-4" />
                  Create Group
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;

