import { useState } from "react";
import { Users, Plus, Search, Settings, Crown, Shield, ArrowLeft } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import CreateGroupModal from "./CreateGroupModal";
import JoinGroupModal from "./JoinGroupModal";

const GroupSidebar = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { groups, selectedGroup, setSelectedGroup, getUserGroups, isGroupsLoading } = useGroupStore();
  const { authUser } = useAuthStore();

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (group) => {
    if (group.admin._id === authUser._id) {
      return <Crown className="size-3 text-yellow-500" />;
    }
    const member = group.members.find(m => m.userId._id === authUser._id);
    if (member?.role === "moderator") {
      return <Shield className="size-3 text-blue-500" />;
    }
    return null;
  };

  const getOnlineMembersCount = (group) => {
    return group.members.filter(member => 
      member.isActive && member.userId._id !== authUser._id
    ).length;
  };

  return (
    <div className="flex flex-col h-full bg-base-100 border-r border-base-300">
      {/* Header */}
      <div className="p-4 border-b border-base-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="size-5" />
              Groups
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn btn-ghost btn-sm btn-circle"
              title="Join Group"
            >
              <Search className="size-4" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-ghost btn-sm btn-circle"
              title="Create Group"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input input-bordered input-sm w-full pl-8"
          />
          <Search className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-base-content/50" />
        </div>
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto">
        {isGroupsLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="w-10 h-10 bg-base-300 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-base-300 rounded animate-pulse mb-1"></div>
                  <div className="h-3 bg-base-300 rounded animate-pulse w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-4 text-center text-base-content/50">
            {searchTerm ? "No groups found" : "No groups yet"}
            <br />
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary btn-sm mt-2"
            >
              Create your first group
            </button>
          </div>
        ) : (
          <div className="p-2">
            {filteredGroups.map((group) => (
              <div
                key={group._id}
                onClick={() => setSelectedGroup(group)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-base-200 ${
                  selectedGroup?._id === group._id ? "bg-primary/10 border border-primary/20" : ""
                }`}
              >
                <div className="relative">
                  <div className="avatar">
                    <div className="w-10 h-10 rounded-full">
                      <img 
                        src={group.profilePic || "/avatar.png"} 
                        alt="group avatar" 
                      />
                    </div>
                  </div>
                  {/* Unread count badge on group avatar */}
                  {group.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg z-10">
                      {group.unreadCount > 9 ? "9+" : group.unreadCount}
                    </span>
                  )}
                  {group.isPrivate && !group.unreadCount && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-base-300 rounded-full flex items-center justify-center">
                      <span className="text-xs">🔒</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="font-medium truncate">{group.name}</span>
                    {getRoleIcon(group)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-base-content/50">
                    <span>{getOnlineMembersCount(group)} members</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            getUserGroups();
          }}
        />
      )}

      {showJoinModal && (
        <JoinGroupModal
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => {
            setShowJoinModal(false);
            getUserGroups();
          }}
        />
      )}
    </div>
  );
};

export default GroupSidebar;
