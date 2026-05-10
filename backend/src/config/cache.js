/**
 * Redis Cache Configuration
 */

import { env } from "./env.js";

export const REDIS_CONFIG = {
    // From cache.service.js and videoProcessor.queue.js
    HOST: env.REDIS_HOST || 'yt-redis',
    PORT: parseInt(env.REDIS_PORT) || 6379,

    // From cache.service.js withRedisRetry()
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 500,

    // From cache.service.js invalidatePattern()
    DELETE_BATCH_SIZE: 100,

    // For organizing cache keys by entity type for easier invalidation
    KEY_PREFIX: {
        VIDEO: 'video:',
        USER: 'user:',
        COMMENT: 'comment:',
        LIKE: 'like:',
        SUBSCRIPTION: 'subscription:',
        PLAYLIST: 'playlist:',
        SESSION: 'session:',
        QUEUE: 'queue:',
    },
};

export const CACHE_CONFIG = {
    TTL: {
        // Short-lived caches (5min TTL)
        COMMENTS: 5 * 60,
        LIKES: 5 * 60,

        // Lists that change less frequently (30min TTL)
        VIDEO_DETAILS: 30 * 60,
        USER_PROFILE: 30 * 60,
        PLAYLIST: 30 * 60,

        // Lists that change more frequently (1hr TTL)        
        VIDEO_LIST: 60 * 60,
        SUBSCRIPTIONS: 60 * 60,

        // Session cache
        SESSION: 7 * 24 * 60 * 60,
    },

    // When to clear cache for related feilds, this helps instant update of data on FE when a change is made on BE
    INVALIDATION_PATTERNS: {
        // When a video is updated, invalidate:
        VIDEO_UPDATE: [
            'video:*',
            'playlist:*',
            'user:*:videos',
        ],

        // When a comment is added, invalidate:
        COMMENT_ADD: [
            'comment:*',
            'video:*:comments',
        ],

        // When a like is added, invalidate:
        LIKE_ADD: [
            'like:*',
            'video:*:likes',
        ],

        // When a user subscribes, invalidate:
        SUBSCRIPTION_UPDATE: [
            'subscription:*',
            'user:*:subscribers',
        ],
    },
};
