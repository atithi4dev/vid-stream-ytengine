import IORedis from 'ioredis';
import logger from '../logger/logger.js';
import { REDIS_CONFIG, CACHE_CONFIG } from '../config/cache.js';

export const redisClient = new IORedis({
    host: REDIS_CONFIG.HOST,
    port: REDIS_CONFIG.PORT,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redisClient.on('connect', () => {
    logger.info('Redis connected successfully');
});

redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', err.message);
});

export const connectRedis = async () => {
    try {
        await redisClient.ping();
        logger.info('Redis connection verified');
        return true;
    } catch (err) {
        logger.error('Redis connection failed:', err.message);
        throw new Error(`Redis connection failed: ${err.message}`);
    }
};

export const cacheService = {
    get: async (key) => {
        try {
            const value = await redisClient.get(key);
            return value ? JSON.parse(value) : null;
        } catch (err) {
            logger.error(`Error getting cache for key ${key}:`, err);
            return null;
        }
    },
    
    set: async (key, value, ttl) => {
        try {
            await redisClient.setex(key, ttl, JSON.stringify(value));
        } catch (err) {
            logger.error(`Error setting cache for key ${key}:`, err);
        }
    },
    
    delete: async (key) => {
        try {
            await redisClient.del(key);
        } catch (err) {
            logger.error(`Error deleting cache for key ${key}:`, err);
        }
    },
    
    invalidatePattern: async (pattern) => {
        try {
            const stream = redisClient.scanIterator({ match: pattern });
            let batch = [];

            for await (const key of stream) {
                batch.push(key);

                if (batch.length >= REDIS_CONFIG.DELETE_BATCH_SIZE) {
                    await redisClient.del(...batch);
                    batch = [];
                }
            }
            if (batch.length > 0) {
                await redisClient.del(...batch);
            }
        } catch (err) {
            logger.error(`Redis INVALIDATE failed for ${pattern}`, err);
        }
    },
};