/**
 * Database Configuration
 * Based on actual usage in db/index.js
 */

export const DATABASE_CONFIG = {
  // ============ CONNECTION STRING ============
  // From .env: MONGO_URI (from env.js)
  URI: process.env.MONGO_URI,
  
  // ============ DATABASE NAME SUFFIX ============
  // From db/index.js - appends "vidtube" to MONGO_URI
  DB_NAME_SUFFIX: 'vidtube',
  
  // ============ CONNECTION SETTINGS ============
  // From db/index.js
  SERVER_SELECTION_TIMEOUT_MS: 5000,
  
  // ============ RETRY STRATEGY ============
  // From db/index.js connectDB()
  MAX_RETRIES: 5,
  RETRY_DELAY_MS: 1000, // Starting delay, increases with each retry
  RETRY_BACKOFF_MULTIPLIER: 1, // Linear backoff: 1s, 2s, 3s, 4s, 5s
  
  // ============ CONNECTION VALIDATION ============
  MIN_CONNECTION_STRING_LENGTH: 10, // From env.js Zod validation
};
