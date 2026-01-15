import { useAuthStore } from "../store/useAuthStore";
import ProfilePictureUpload from "../components/ProfilePictureUpload";
import { format } from "date-fns";
import { LogOut, Copy, Check, Hash } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const { authUser, logout } = useAuthStore();
  const [copiedUserTag, setCopiedUserTag] = useState(false);

  const copyUserTag = () => {
    navigator.clipboard.writeText(authUser.userTag);
    setCopiedUserTag(true);
    toast.success("User ID copied to clipboard!");
    setTimeout(() => setCopiedUserTag(false), 2000);
  };

  return (
    <div className="h-screen container mx-auto px-4 pt-20 max-w-5xl">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Profile</h2>
          <p className="text-sm text-base-content/70">Manage your profile information</p>
        </div>

        <div className="bg-base-100 rounded-lg shadow-lg p-6">
          <div className="flex flex-col items-center gap-6">
            <ProfilePictureUpload 
              currentProfilePic={authUser.profilePic}
              onUpdate={() => {
                // Refresh the page or update the user data
                window.location.reload();
              }}
            />
            
            <div className="w-full max-w-md space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Full Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={authUser.fullName}
                  readOnly
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered"
                  value={authUser.email}
                  readOnly
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">User ID</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-base-200 px-3 py-2 rounded-lg flex-1">
                    <Hash className="size-4 text-base-content/70" />
                    <span className="font-mono text-lg font-semibold">{authUser.userTag}</span>
                  </div>
                  <button
                    onClick={copyUserTag}
                    className="btn btn-ghost btn-sm btn-circle"
                    title="Copy User ID"
                  >
                    {copiedUserTag ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                  </button>
                </div>
                <div className="label">
                  <span className="label-text-alt">Share this ID with others to let them add you as a friend</span>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Joined Date</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={format(new Date(authUser.createdAt), "MMMM d, yyyy")}
                  readOnly
                />
              </div>

              <div className="form-control pt-4">
                <button 
                  className="btn btn-error gap-2 w-full" 
                  onClick={logout}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
