/**
 * Application Constants
 */

export const HTTP_CONFIG = {
  // From app.js
  JSON_LIMIT: '16kb',
  URLENCODED_LIMIT: '16kb',
};

export const RATE_LIMIT_CONFIG = {
  // From app.js
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 400, // requests per window
};

export const PAGINATION_CONFIG = {
  // From controllers (comment, video, dashboard)
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  ALTERNATE_LIMIT: 30, // Used in some video endpoints
};

export const DATABASE_CONFIG = {
  // From db/index.js
  MAX_RETRIES: 5,
  SERVER_SELECTION_TIMEOUT_MS: 5000,
  DB_NAME_SUFFIX: 'vidtube',
};

export const SECURITY_CONFIG = {
  // From user.models.js
  BCRYPT_SALT_ROUNDS: 10,
};

export const FILE_CONFIG = {
  // From multer.middlewares.js and Cloudinary.js
  TEMP_DIRECTORY: './public/temp',
  OUTPUT_DIRECTORY: './public/output',
  CLOUDINARY_IMAGES_FOLDER: 'images',
  CLOUDINARY_VIDEOS_FOLDER: 'videos',
};

export const QUEUE_CONFIG = {
  // From videoProcessor.queue.js
  VIDEO_TRANSCODE_QUEUE_NAME: 'video-transcode',
};

export const VIDEO_CONFIG = {
  // From video.models.js
  ENCODING_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    READY: 'ready',
  },
  HLS_RESOLUTIONS: ['1080p', '720p', '360p'],
};

export const SORT_CONFIG = {
  // From video.controller.js
  ALLOWED_SORT_TYPES: ['asc', 'desc'],
  ALLOWED_SORT_BY_FIELDS: ['createdAt', 'duration'],
};
