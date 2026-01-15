import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Users, 
  Settings, 
  Crown, 
  Shield, 
  UserPlus, 
  UserMinus, 
  Edit3, 
  Trash2, 
  Copy,
  Check,
  Globe,
  Lock,
  Calendar,
  Hash
} from "lucide-react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const GroupProfilePage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    isPrivate: false,
    maxMembers: 100
  });
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberTag, setNewMemberTag] = useState("");
  const [copiedInviteCode, setCopiedInviteCode] = useState(false);

  const { 
    getGroupDetails, 
    updateGroup, 
    deleteGroup, 
    addMemberToGroup, 
    removeMemberFromGroup,
    leaveGroup 
  } = useGroupStore();
  const { authUser } = useAuthStore();

  useEffect(() => {
    const fetchGroup = async () => {
      setIsLoading(true);
      try {
        const groupData = await getGroupDetails(groupId);
        if (groupData) {
          setGroup(groupData);
          setEditForm({
            name: groupData.name,
            description: groupData.description,
            isPrivate: groupData.isPrivate,
            maxMembers: groupData.maxMembers
          });
        } else {
          navigate("/");
        }
      } catch (error) {
        console.error("Error fetching group:", error);
        navigate("/");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroup();
  }, [groupId, getGroupDetails, navigate]);

  const handleUpdateGroup = async () => {
    try {
      const updatedGroup = await updateGroup(groupId, editForm);
      if (updatedGroup) {
        setGroup(updatedGroup);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating group:", error);
    }
  };

  const handleDeleteGroup = async () => {
    if (window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      try {
        await deleteGroup(groupId);
        navigate("/");
      } catch (error) {
        console.error("Error deleting group:", error);
      }
    }
  };

  const handleLeaveGroup = async () => {
    if (window.confirm("Are you sure you want to leave this group?")) {
      try {
        await leaveGroup(groupId);
        navigate("/");
      } catch (error) {
        console.error("Error leaving group:", error);
      }
    }
  };

  const handleAddMember = async () => {
    if (!newMemberTag.trim()) return;
    
    try {
      const updatedGroup = await addMemberToGroup(groupId, newMemberTag.trim());
      if (updatedGroup) {
        setGroup(updatedGroup);
        setNewMemberTag("");
        setShowAddMember(false);
      }
    } catch (error) {
      console.error("Error adding member:", error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      try {
        const updatedGroup = await removeMemberFromGroup(groupId, memberId);
        if (updatedGroup) {
          setGroup(updatedGroup);
        }
      } catch (error) {
        console.error("Error removing member:", error);
      }
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.inviteCode);
    setCopiedInviteCode(true);
    toast.success("Invite code copied!");
    setTimeout(() => setCopiedInviteCode(false), 2000);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return <Crown className="size-4 text-yellow-500" />;
      case "moderator":
        return <Shield className="size-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const isAdmin = group?.admin._id === authUser._id;
  const userMember = group?.members.find(member => 
    member.userId._id === authUser._id && member.isActive
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Group not found</h2>
          <button onClick={() => navigate("/")} className="btn btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="bg-base-100 border-b border-base-300 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="avatar">
                <div className="w-12 h-12 rounded-full">
                  <img 
                    src={group.profilePic || "/avatar.png"} 
                    alt="group avatar" 
                  />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-semibold">{group.name}</h1>
                <p className="text-sm text-base-content/70">Group Profile</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Group Info Card */}
        <div className="bg-base-100 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="size-5" />
              Group Information
            </h2>
            {isAdmin && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="btn btn-ghost btn-sm"
              >
                <Edit3 className="size-4" />
                {isEditing ? "Cancel" : "Edit"}
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Group Name</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input input-bordered w-full"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  maxLength={200}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Privacy</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="privacy"
                      checked={!editForm.isPrivate}
                      onChange={() => setEditForm(prev => ({ ...prev, isPrivate: false }))}
                      className="radio radio-primary"
                    />
                    <Globe className="size-4" />
                    <span>Public</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="privacy"
                      checked={editForm.isPrivate}
                      onChange={() => setEditForm(prev => ({ ...prev, isPrivate: true }))}
                      className="radio radio-primary"
                    />
                    <Lock className="size-4" />
                    <span>Private</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Max Members</span>
                </label>
                <select
                  value={editForm.maxMembers}
                  onChange={(e) => setEditForm(prev => ({ ...prev, maxMembers: parseInt(e.target.value) }))}
                  className="select select-bordered w-full"
                >
                  <option value={50}>50 members</option>
                  <option value={100}>100 members</option>
                  <option value={200}>200 members</option>
                  <option value={500}>500 members</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdateGroup}
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-base-content/70">Name</label>
                  <p className="text-lg">{group.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-base-content/70">Privacy</label>
                  <div className="flex items-center gap-2">
                    {group.isPrivate ? (
                      <>
                        <Lock className="size-4" />
                        <span>Private</span>
                      </>
                    ) : (
                      <>
                        <Globe className="size-4" />
                        <span>Public</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-base-content/70">Members</label>
                  <p className="text-lg">{group.members.filter(m => m.isActive).length} / {group.maxMembers}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-base-content/70">Created</label>
                  <p className="text-lg">{new Date(group.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              {group.description && (
                <div>
                  <label className="text-sm font-medium text-base-content/70">Description</label>
                  <p className="text-lg">{group.description}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-base-content/70">Invite Code</label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-base-200 px-3 py-2 rounded-lg">
                    <Hash className="size-4" />
                    <span className="font-mono text-lg">{group.inviteCode}</span>
                  </div>
                  <button
                    onClick={copyInviteCode}
                    className="btn btn-sm btn-ghost"
                  >
                    {copiedInviteCode ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Members Section */}
        <div className="bg-base-100 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="size-5" />
              Members ({group.members.filter(m => m.isActive).length})
            </h2>
            {isAdmin && (
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="btn btn-primary btn-sm"
              >
                <UserPlus className="size-4" />
                Add Member
              </button>
            )}
          </div>

          {showAddMember && (
            <div className="mb-4 p-4 bg-base-200 rounded-lg">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter user tag (e.g., 1234)"
                  value={newMemberTag}
                  onChange={(e) => setNewMemberTag(e.target.value)}
                  className="input input-bordered flex-1"
                  maxLength={4}
                />
                <button
                  onClick={handleAddMember}
                  disabled={!newMemberTag.trim()}
                  className="btn btn-primary"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddMember(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {group.members
              .filter(member => member.isActive)
              .map((member) => (
                <div key={member.userId._id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full">
                        <img src={member.userId.profilePic} alt="avatar" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.userId.fullName}</span>
                        {getRoleIcon(member.role)}
                        {member.userId._id === group.admin._id && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Admin</span>
                        )}
                      </div>
                      <p className="text-sm text-base-content/70">#{member.userId.userTag}</p>
                    </div>
                  </div>
                  {isAdmin && member.userId._id !== authUser._id && (
                    <button
                      onClick={() => handleRemoveMember(member.userId._id)}
                      className="btn btn-error btn-sm btn-circle"
                    >
                      <UserMinus className="size-4" />
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-base-100 rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-error mb-4">Danger Zone</h2>
          <div className="space-y-3">
            {isAdmin ? (
              <button
                onClick={handleDeleteGroup}
                className="btn btn-error w-full"
              >
                <Trash2 className="size-4" />
                Delete Group
              </button>
            ) : (
              <button
                onClick={handleLeaveGroup}
                className="btn btn-warning w-full"
              >
                Leave Group
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupProfilePage;

