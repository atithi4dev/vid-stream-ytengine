import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
    host: process.env.REDIS_HOST || "yt-redis",
    port: 6379,
});

export const videoQueue = new Queue("video-transcode", { connection });
