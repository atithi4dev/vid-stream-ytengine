import connectDB from "../../db/index.js";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { transcodeVideo } from "./transcodeVideo.js";
import path from "path";
import { fileURLToPath } from "url";
import { unlink, access } from "fs/promises";
import { constants } from "fs";
import dotenv from "dotenv";
import { ApiError } from "../../utils/api-utils/ApiError.js";
import logger from "../../logger/logger.js";
import { videoHlsformation } from "../Queue/videoHls.queue.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, "../../../.env");
dotenv.config({ path: envPath });

await connectDB();
logger.info("MongoDB Connected");

const connection = new IORedis({
  maxRetriesPerRequest: null,
  host: process.env.REDIS_HOST || "yt-redis",
  port: 6379,
});

const worker = new Worker(
  "video-transcode",
  async (job) => {
    const { inputPath, baseOutputPath, videoId } = job.data;
    if (!inputPath || !baseOutputPath || !videoId) {
      throw new ApiError(400, "Missing videoId or inputPath or baseOutputPath in job data");
    }

    const resolvedInputPath = path.resolve(__dirname, "../../../", inputPath);
    const resolvedOutputPath = path.resolve(
      __dirname,
      "../../../",
      baseOutputPath
    );
    
    logger.info(`Resolved input path for videoId ${videoId}: ${resolvedInputPath}`);
    logger.info(`Resolved output path for videoId ${videoId}: ${resolvedOutputPath}`);

    logger.info(
      `Job Received: input = ${inputPath}, output=${baseOutputPath}, videoId=${videoId}`
    );
    logger.info(`Attempt ${job.attemptsMade + 1}/${job.opts.attempts}`);

    const result = await transcodeVideo(
      resolvedInputPath,
      resolvedOutputPath,
      videoId,
      job
    );
    return result;
  },
  { connection }
);

worker.on("completed", async (job, result) => {
  const { videoId, metaData, inputPath } = result;
  if (!result || !videoId || !metaData || !inputPath) {
    logger.error("Missing data in transcoding result");
    return;
  }

  logger.info(`Job ${job.id} completed`);

  try {
    if (inputPath) {
      await access(inputPath, constants.F_OK);
      await unlink(inputPath);
      logger.info(`Temp video deleted: ${inputPath}`);
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      logger.warn(`File already deleted or not found: ${inputPath}`);
    } else {
      throw new ApiError(
        500,
        "Failed to delete temporary video",
        [],
        err.stack
      );
    }
  }

  try {
    const hlsJob = await videoHlsformation.add(
      "video-hls-conversion",
      { ...result },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      }
    );
    logger.info(`HLS job queued [JobID: ${hlsJob.id}] for video: ${videoId}`);
  } catch (err) {
    throw new ApiError(500, "Failed to queue HLS job", [], err.stack);
  }
});

worker.on("failed", (job, err) => {
  logger.error(`Job ${job.id} failed`, err);
});
