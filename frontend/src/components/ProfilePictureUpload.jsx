import { useState, useRef } from "react";
import { Image, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const ProfilePictureUpload = ({ currentProfilePic, onUpdate }) => {
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const { updateProfilePicture } = useAuthStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!preview) return;

    try {
      await updateProfilePicture(preview);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUpdate?.();
      toast.success("Profile picture updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile picture");
    }
  };

  const removePreview = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <img
          src={preview || currentProfilePic || "/avatar.png"}
          alt="Profile"
          className="size-32 object-cover rounded-full border-4 border-base-200"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-primary-content hover:bg-primary-focus transition-colors"
        >
          <Image className="size-5" />
        </button>
      </div>

      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageChange}
      />

      {preview && (
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            className="btn btn-primary btn-sm"
          >
            Save
          </button>
          <button
            onClick={removePreview}
            className="btn btn-ghost btn-sm"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfilePictureUpload; 