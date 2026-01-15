import { uploadToCloudinary } from "../lib/cloudinary.js";
import cloudinary from "../lib/cloudinary.js";
import fs from "fs";
import { logSecurityEvent } from "../lib/utils.js";

// Enhanced file upload with comprehensive security
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "No file uploaded" 
      });
    }

    const { originalname, mimetype, size, path: filePath } = req.file;

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (size > maxSize) {
      // Clean up temporary file
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      logSecurityEvent('File Upload Rejected', {
        reason: 'File too large',
        fileName: originalname,
        fileSize: size,
        userId: req.user?._id
      }, req);
      
      return res.status(400).json({ 
        error: "File Too Large", 
        message: "File size exceeds 10MB limit" 
      });
    }

    // Enhanced file type validation
    const allowedTypes = {
      'image/jpeg': { extension: '.jpg', category: 'image' },
      'image/png': { extension: '.png', category: 'image' },
      'image/gif': { extension: '.gif', category: 'image' },
      'image/webp': { extension: '.webp', category: 'image' },
      'application/pdf': { extension: '.pdf', category: 'document' },
      'application/msword': { extension: '.doc', category: 'document' },
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extension: '.docx', category: 'document' },
      'application/vnd.ms-excel': { extension: '.xls', category: 'document' },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { extension: '.xlsx', category: 'document' },
      'text/plain': { extension: '.txt', category: 'text' },
      'application/zip': { extension: '.zip', category: 'archive' },
      'application/x-rar-compressed': { extension: '.rar', category: 'archive' }
    };

    if (!allowedTypes[mimetype]) {
      // Clean up temporary file
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      logSecurityEvent('File Upload Rejected', {
        reason: 'Invalid file type',
        fileName: originalname,
        mimetype: mimetype,
        userId: req.user?._id
      }, req);
      
      return res.status(400).json({ 
        error: "Invalid File Type", 
        message: "File type not supported. Allowed types: images, PDFs, documents, text files, and archives." 
      });
    }

    // Validate file extension matches MIME type
    const fileExtension = originalname.toLowerCase().substring(originalname.lastIndexOf('.'));
    const expectedExtension = allowedTypes[mimetype].extension;
    
    if (fileExtension !== expectedExtension) {
      // Clean up temporary file
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      logSecurityEvent('File Upload Rejected', {
        reason: 'Extension mismatch',
        fileName: originalname,
        fileExtension: fileExtension,
        expectedExtension: expectedExtension,
        userId: req.user?._id
      }, req);
      
      return res.status(400).json({ 
        error: "File Extension Mismatch", 
        message: "File extension does not match file type" 
      });
    }

    // Additional security checks for images
    if (allowedTypes[mimetype].category === 'image') {
      // Check for malicious image headers
      try {
        const fileBuffer = fs.readFileSync(filePath);
        const header = fileBuffer.toString('hex', 0, 4);
        
        // Check for valid image headers
        const validHeaders = ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2', '89504e47', '47494638'];
        if (!validHeaders.some(h => header.startsWith(h))) {
          // Clean up temporary file
          if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          
          logSecurityEvent('File Upload Rejected', {
            reason: 'Invalid image header',
            fileName: originalname,
            header: header,
            userId: req.user?._id
          }, req);
          
          return res.status(400).json({ 
            error: "Invalid Image File", 
            message: "File appears to be corrupted or malicious" 
          });
        }
      } catch (error) {
        // Clean up temporary file
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        return res.status(400).json({ 
          error: "File Read Error", 
          message: "Unable to read file for validation" 
        });
      }
    }

    // Generate secure filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const secureFileName = `${timestamp}_${randomString}_${originalname}`;

    // Upload to Cloudinary with enhanced security settings
    const uploadOptions = {
      resource_type: "auto",
      folder: "secure-files",
      public_id: secureFileName,
      overwrite: false,
      invalidate: true
    };

    // Add image-specific transformations
    if (allowedTypes[mimetype].category === 'image') {
      uploadOptions.transformation = [
        { width: 1920, height: 1080, crop: "limit" },
        { quality: "auto", fetch_format: "auto" }
      ];
    }

    const result = await uploadToCloudinary(filePath, uploadOptions);

    // Clean up temporary file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Log successful upload
    logSecurityEvent('File Upload Success', {
      fileName: originalname,
      fileSize: size,
      fileType: mimetype,
      publicId: result.public_id,
      userId: req.user?._id
    }, req);

    res.status(200).json({
      fileName: originalname,
      fileUrl: result.secure_url,
      fileSize: size,
      fileType: mimetype,
      publicId: result.public_id,
      category: allowedTypes[mimetype].category,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error in uploadFile:", error.message);
    
    // Clean up temporary file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    logSecurityEvent('File Upload Error', {
      error: error.message,
      fileName: req.file?.originalname,
      userId: req.user?._id
    }, req);
    
    res.status(500).json({ 
      error: "Upload Failed", 
      message: "Error uploading file. Please try again." 
    });
  }
};

// Enhanced file deletion with security checks
export const deleteFile = async (req, res) => {
  try {
    const { publicId } = req.params;
    const userId = req.user._id;

    if (!publicId) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "Public ID is required" 
      });
    }

    // Validate publicId format (basic security check)
    if (!/^[a-zA-Z0-9_\-/]+$/.test(publicId)) {
      logSecurityEvent('File Deletion Attempt', {
        reason: 'Invalid public ID format',
        publicId: publicId,
        userId: userId
      }, req);
      
      return res.status(400).json({ 
        error: "Invalid Public ID", 
        message: "Invalid file identifier format" 
      });
    }

    // Get file info first to verify ownership (if needed)
    try {
      const fileInfo = await cloudinary.api.resource(publicId);
      
      // Check if file belongs to user's folder (basic ownership check)
      if (!fileInfo.public_id.includes(`secure-files`)) {
        logSecurityEvent('File Deletion Attempt', {
          reason: 'Unauthorized file access',
          publicId: publicId,
          userId: userId
        }, req);
        
        return res.status(403).json({ 
          error: "Access Denied", 
          message: "You don't have permission to delete this file" 
        });
      }
    } catch (apiError) {
      if (apiError.http_code === 404) {
        return res.status(404).json({ 
          error: "File Not Found", 
          message: "File does not exist" 
        });
      }
      throw apiError;
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      // Log successful deletion
      logSecurityEvent('File Deletion Success', {
        publicId: publicId,
        userId: userId
      }, req);
      
      res.status(200).json({ 
        message: "File deleted successfully" 
      });
    } else {
      logSecurityEvent('File Deletion Failed', {
        reason: 'Cloudinary deletion failed',
        publicId: publicId,
        result: result,
        userId: userId
      }, req);
      
      res.status(400).json({ 
        error: "Deletion Failed", 
        message: "Failed to delete file from storage" 
      });
    }
  } catch (error) {
    console.error("Error in deleteFile:", error.message);
    
    logSecurityEvent('File Deletion Error', {
      error: error.message,
      publicId: req.params.publicId,
      userId: req.user?._id
    }, req);
    
    res.status(500).json({ 
      error: "Deletion Error", 
      message: "Error deleting file. Please try again." 
    });
  }
};

// Enhanced file info retrieval with security
export const getFileInfo = async (req, res) => {
  try {
    const { publicId } = req.params;
    const userId = req.user._id;

    if (!publicId) {
      return res.status(400).json({ 
        error: "Validation Error", 
        message: "Public ID is required" 
      });
    }

    // Validate publicId format
    if (!/^[a-zA-Z0-9_\-/]+$/.test(publicId)) {
      return res.status(400).json({ 
        error: "Invalid Public ID", 
        message: "Invalid file identifier format" 
      });
    }

    // Get file info from Cloudinary
    const result = await cloudinary.api.resource(publicId);
    
    // Basic ownership check
    if (!result.public_id.includes(`secure-files`)) {
      return res.status(403).json({ 
        error: "Access Denied", 
        message: "You don't have permission to access this file" 
      });
    }

    res.status(200).json({
      fileName: result.original_filename,
      fileUrl: result.secure_url,
      fileSize: result.bytes,
      fileType: result.format,
      createdAt: result.created_at,
      lastModified: result.last_modified,
      width: result.width,
      height: result.height
    });
  } catch (error) {
    console.error("Error in getFileInfo:", error.message);
    
    if (error.http_code === 404) {
      return res.status(404).json({ 
        error: "File Not Found", 
        message: "File does not exist" 
      });
    }
    
    res.status(500).json({ 
      error: "File Info Error", 
      message: "Error retrieving file information" 
    });
  }
};
