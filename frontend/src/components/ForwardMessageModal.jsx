import { useState, useEffect } from "react";
import { X, Search, User, MessageSquare } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useNavigate } from "react-router-dom";

const ForwardMessageModal = ({ isOpen, onClose, message }) => {
  const { users, setSelectedUser } = useChatStore();
  const { groups } = useGroupStore();
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  if (!isOpen || !message) return null;

  const filteredUsers = users.filter(
    user => user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = groups.filter(
    group => group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleForward = async (recipient, isGroup = false) => {
    try {
      const messageData = {
        text: message.text,
        image: message.image,
        isForwarded: true,
        forwardedFrom: message.senderId?._id || message.senderId,
        // Preserve protection flags from original message
        preventForwarding: message.preventForwarding || false,
        disableCopy: message.disableCopy || false,
      };

      if (isGroup) {
        // Forward to group
        await axiosInstance.post(`/group/send/${recipient._id}`, messageData);
      } else {
        // Forward to user
        await axiosInstance.post(`/messages/send/${recipient._id}`, messageData);
      }
      
      toast.success(`Message forwarded to ${recipient.fullName || recipient.name}`);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to forward message");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="text-lg font-semibold">Forward Message</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="size-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-base-300">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-base-content/50" />
            <input
              type="text"
              placeholder="Search contacts or groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Chats Section */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-base-content/70 mb-2 flex items-center gap-2">
                <MessageSquare className="size-4" />
                Chats
              </h4>
              <div className="space-y-1">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => handleForward(user, false)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors"
                    >
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{user.fullName}</div>
                        <div className="text-sm text-base-content/60">
                          #{user.userTag}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-base-content/50 p-4 text-center">
                    No chats found
                  </div>
                )}
              </div>
            </div>

            {/* Groups Section */}
            <div>
              <h4 className="text-sm font-semibold text-base-content/70 mb-2 flex items-center gap-2">
                <User className="size-4" />
                Groups
              </h4>
              <div className="space-y-1">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <button
                      key={group._id}
                      onClick={() => handleForward(group, true)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-base-200 transition-colors"
                    >
                      <img
                        src={group.profilePic || "/avatar.png"}
                        alt={group.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{group.name}</div>
                        <div className="text-sm text-base-content/60">
                          {group.members.filter(m => m.isActive).length} members
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-base-content/50 p-4 text-center">
                    No groups found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForwardMessageModal;

