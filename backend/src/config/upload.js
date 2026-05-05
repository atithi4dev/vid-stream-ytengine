/**
 * Upload Configuration
 * Based on actual usage in multer.middlewares.js and Cloudinary.js
 */

export const UPLOAD_CONFIG = {
  // ============ MULTER STORAGE PATHS ============
  // From multer.middlewares.js
  TEMP_DIRECTORY: './public/temp',
  OUTPUT_DIRECTORY: './public/output',
  
  // ============ CLOUDINARY FOLDERS ============
  // From Cloudinary.js upload functions
  CLOUDINARY_IMAGES_FOLDER: 'images',
  CLOUDINARY_VIDEOS_FOLDER: 'videos',
  
  // ============ FILE UPLOAD SETTINGS ============
  // Note: multer.middlewares.js has NO explicit size limits
  // Size validation should be added at controller level if needed
  
  // Allowed video formats (referenced in models)
  ALLOWED_VIDEO_FORMATS: ['mp4', 'mkv', 'avi', 'mov', 'webm'],
  VIDEO_MIME_TYPES: ['video/mp4', 'video/x-matroska', 'video/x-msvideo', 'video/quicktime', 'video/webm'],
  
  // Allowed image formats (for thumbnails, avatars, covers)
  ALLOWED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
  IMAGE_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  
  // ============ FILE SIZE LIMITS ============
  // Add if needed - currently no limits in multer config
  // RECOMMENDED: Uncomment and adjust for production
  // MAX_VIDEO_FILE_SIZE: 512 * 1024 * 1024, // 512MB
  // MAX_IMAGE_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  // MAX_AVATAR_FILE_SIZE: 2 * 1024 * 1024, // 2MB
  
  // ============ UPLOAD NAMING ============
  // From multer.middlewares.js storage configuration
  // Files are named: fieldname-{Date.now()}-{random}.{ext}
  // Example: "video-1704067200000-123456789.mp4"
};
