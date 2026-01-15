import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    userTag: {
      type: String,
      required: true,
      match: /^\d{4}$/,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1, userTag: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);

export default User;
