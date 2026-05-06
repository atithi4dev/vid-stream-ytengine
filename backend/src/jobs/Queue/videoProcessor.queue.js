import { Queue } from "bullmq";
import IORedis from "ioredis";
import { REDIS_CONFIG } from "../../config/cache.js";

const connection = new IORedis({
    host: REDIS_CONFIG.HOST || "yt-redis",
    port: 6379,
});

export const videoQueue = new Queue("video-processing", { connection });