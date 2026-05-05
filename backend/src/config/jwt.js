/**
 * JWT Configuration
 * Based on actual usage in user.models.js and env variables
 */

export const JWT_CONFIG = {
    // From env.js - configured in .env file
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,

    // From .env: ACCESS_TOKEN_EXPIRY=1d, REFRESH_TOKEN_EXPIRY=10d
    ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || '15m',
    REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || '7d',

    // From user.controller.js - accessToken and refreshToken stored in cookies
    COOKIE_OPTIONS: {
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'strict',
        path: '/',
    },

    // Add minimum secret length validation
    MIN_SECRET_LENGTH: 10, 
};
