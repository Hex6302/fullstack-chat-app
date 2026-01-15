import { generateToken, sanitizeInput, isValidEmail, validatePasswordStrength, logSecurityEvent } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  try {
    const { fullName, email, password, userTag } = req.body;

    // Input validation
    if (!fullName || !email || !password || !userTag) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "All fields are required" 
      });
    }

    // Sanitize inputs
    const sanitizedFullName = sanitizeInput(fullName);
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedUserTag = userTag.trim();

    // Validate email format
    if (!isValidEmail(sanitizedEmail)) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "Please provide a valid email address" 
      });
    }

    // Validate user tag format
    if (!/^\d{4}$/.test(sanitizedUserTag)) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "User tag must be exactly 4 digits" 
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: "Password Requirements", 
        message: "Password does not meet security requirements",
        details: passwordValidation.errors
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: sanitizedEmail },
        { email: sanitizedEmail, userTag: sanitizedUserTag }
      ]
    });

    if (existingUser) {
      logSecurityEvent('Duplicate Registration Attempt', {
        email: sanitizedEmail,
        userTag: sanitizedUserTag,
        existingUserId: existingUser._id
      }, req);
      
      return res.status(400).json({ 
        error: "User Exists", 
        message: "An account with this email or email/tag combination already exists" 
      });
    }

    // Hash password with higher salt rounds for better security
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new User({
      fullName: sanitizedFullName,
      email: sanitizedEmail,
      password: hashedPassword,
      userTag: sanitizedUserTag,
    });

    // Generate JWT token
    generateToken(newUser._id, res);
    await newUser.save();

    // Log successful registration
    logSecurityEvent('User Registration', {
      userId: newUser._id,
      email: sanitizedEmail,
      userTag: sanitizedUserTag
    }, req);

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      userTag: newUser.userTag,
      profilePic: newUser.profilePic,
    });
  } catch (error) {
    console.error("Error in signup controller:", error.message);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: "Duplicate Entry", 
        message: "An account with this email or user tag already exists" 
      });
    }
    
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: "Unable to create account. Please try again later." 
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "Email and password are required" 
      });
    }

    // Sanitize email
    const sanitizedEmail = email.toLowerCase().trim();

    // Validate email format
    if (!isValidEmail(sanitizedEmail)) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "Please provide a valid email address" 
      });
    }

    // Find user by email
    const user = await User.findOne({ email: sanitizedEmail });

    if (!user) {
      logSecurityEvent('Failed Login Attempt', {
        email: sanitizedEmail,
        reason: 'User not found'
      }, req);
      
      return res.status(400).json({ 
        error: "Authentication Failed", 
        message: "Invalid credentials" 
      });
    }

    // Verify password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      logSecurityEvent('Failed Login Attempt', {
        email: sanitizedEmail,
        userId: user._id,
        reason: 'Invalid password'
      }, req);
      
      return res.status(400).json({ 
        error: "Authentication Failed", 
        message: "Invalid credentials" 
      });
    }

    // Generate new token
    generateToken(user._id, res);

    // Log successful login
    logSecurityEvent('Successful Login', {
      userId: user._id,
      email: sanitizedEmail
    }, req);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      userTag: user.userTag,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.error("Error in login controller:", error.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: "Authentication service temporarily unavailable" 
    });
  }
};

export const logout = (req, res) => {
  try {
    // Clear the JWT cookie with secure settings
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: process.env.NODE_ENV === "development" ? "lax" : "strict",
      path: "/"
    });

    // Log logout event
    logSecurityEvent('User Logout', {
      userId: req.user?._id
    }, req);

    res.status(200).json({ 
      message: "Logged out successfully" 
    });
  } catch (error) {
    console.error("Error in logout controller:", error.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: "Logout failed. Please try again." 
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "Profile picture is required" 
      });
    }

    // Validate base64 image
    if (!profilePic.startsWith('data:image/')) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "Invalid image format" 
      });
    }

    // Upload to Cloudinary with security settings
    const uploadResponse = await cloudinary.uploader.upload(profilePic, {
      resource_type: "image",
      folder: "profile-pictures",
      public_id: `profile_${userId}_${Date.now()}`,
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" }
      ]
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true, runValidators: true }
    );

    // Log profile update
    logSecurityEvent('Profile Update', {
      userId: userId,
      action: 'profile_picture_update'
    }, req);

    res.status(200).json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      userTag: updatedUser.userTag,
      profilePic: updatedUser.profilePic,
      createdAt: updatedUser.createdAt,
    });
  } catch (error) {
    console.error("Error in update profile:", error.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: "Unable to update profile. Please try again later." 
    });
  }
};

export const updateProfilePicture = async (req, res) => {
  try {
    const { image } = req.body;
    const userId = req.user._id;

    if (!image) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "Image is required" 
      });
    }

    // Validate base64 image
    if (!image.startsWith('data:image/')) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "Invalid image format" 
      });
    }

    // Upload to Cloudinary with security settings
    const uploadResponse = await cloudinary.uploader.upload(image, {
      resource_type: "image",
      folder: "profile-pictures",
      public_id: `profile_${userId}_${Date.now()}`,
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" }
      ]
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true, runValidators: true }
    );

    // Log profile picture update
    logSecurityEvent('Profile Picture Update', {
      userId: userId,
      action: 'profile_picture_update'
    }, req);

    res.status(200).json({
      _id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      userTag: updatedUser.userTag,
      profilePic: updatedUser.profilePic,
      createdAt: updatedUser.createdAt,
    });
  } catch (error) {
    console.error("Error in update profile picture:", error.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: "Unable to update profile picture. Please try again later." 
    });
  }
};

export const checkAuth = (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      userTag: user.userTag,
      profilePic: user.profilePic,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error in checkAuth controller:", error.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: "Authentication check failed" 
    });
  }
};

export const searchUserByTag = async (req, res) => {
  try {
    const { userTag } = req.query;
    
    if (!userTag) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "User tag is required" 
      });
    }

    // Validate user tag format
    if (!/^\d{4}$/.test(userTag)) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "User tag must be exactly 4 digits" 
      });
    }

    const user = await User.findOne({ userTag }).select("_id fullName userTag profilePic");
    
    if (!user) {
      return res.status(404).json({ 
        error: "User Not Found", 
        message: "No user found with this tag" 
      });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error in searchUserByTag:", error.message);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: "Search service temporarily unavailable" 
    });
  }
};
