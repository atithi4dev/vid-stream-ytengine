import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({host: process.env.REDIS_HOST || "yt-redis",
  port: 6379,});

const clearQueue = async () => {
  const queue = new Queue("video-transcode", { connection });

  await queue.drain(); 
  await queue.clean(0, 0, "completed");
  await queue.clean(0, 0, "failed");

  await queue.obliterate({ force: true });
  console.log("🧹 Queue cleared and job ID reset.");
  process.exit(0);
};

clearQueue();
