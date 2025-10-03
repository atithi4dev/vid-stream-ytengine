import connectDB from "../../../db/index.js";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs/promises";
import { generateHLSChunks } from "./transcodeVideo.js";
import Video from "../../../models/video.models.js";
import logger from "../../../logger/logger.js";
import { ApiError } from "../../../utils/ApiError.js";
import { publishProgress } from "../../../utils/videoProgress.js";
import { updateS3VideoHls } from "../../../utils/S3Upload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, "../../../../.env");
dotenv.config({ path: envPath });

await connectDB();
logger.info("MongoDB Connected");

const connection = new IORedis({
  maxRetriesPerRequest: null,
  host: process.env.REDIS_HOST || "yt-redis",
  port: 6379,
});

const RESOLUTIONS = ["360p", "720p", "1080p"];

export const getAllHLSMetadata = async (hlsS3Path, hlsLocalPath, videoId) => {
  const result = {};
  const publicBase = hlsS3Path;

  for (const res of RESOLUTIONS) {
    const resDir = path.join(hlsLocalPath, res);
    let count = 0;
    let size = 0;

    try {
      const files = await fs.readdir(resDir);

      const tsFiles = files.filter((file) => file.endsWith(".ts"));
      count = tsFiles.length;

      const tsStats = await Promise.all(
        tsFiles.map((file) => fs.stat(path.join(resDir, file)))
      );
      size = tsStats.reduce((acc, stat) => acc + stat.size, 0);

      const sizeInKB = Number((size / 1024).toFixed(1));
      result[res] = {
        playlistUrl: `${publicBase}/${res}/index.m3u8`,
        count,
        size: sizeInKB,
      };
    } catch (err) {
      console.warn(
        `⚠️  Skipping HLS resolution ${res} for video ${videoId}: ${err.message}`
      );
      result[res] = {
        playlistUrl: null,
        count: 0,
        size: 0,
        error: `Resolution ${res} not found or error: ${err.message}`,
      };
    }
  }

  return result;
};

async function updateMongoVideoHls(
  hlsS3Path,
  hlsLocalPath,
  videoId,
  masterUrl
) {
  try {
    const data = await getAllHLSMetadata(hlsS3Path, hlsLocalPath, videoId);

    await Video.findByIdAndUpdate(videoId, {
      hls: {
        masterUrl,
        resolutions: data,
      },
    });
  } catch (err) {
    throw new ApiError(
      500,
      `Failed to update video document with HLS data for videoId: ${videoId}`,
      [],
      err.stack
    );
  }
}

const worker = new Worker(
  "video-hls-conversion",
  async (job) => {
    const { videoId, outputDir } = job.data;

    if (!videoId || !outputDir) {
      throw new ApiError(400, "Missing videoId or outputDir in job data");
    }

    logger.info(`HLS Worker started for videoId: ${videoId}`);

    try {
      return await generateHLSChunks(outputDir, videoId);
    } catch (err) {
      throw new ApiError(
        500,
        `generateHLSChunks failed for videoId: ${videoId}`,
        [],
        err.stack
      );
    }
  },
  {
    connection,
  }
);

worker.on("completed", async (job, result) => {
  logger.info(`HLS Job ${job.id} completed`);

  if (!result?.videoId || !result?.hlsBaseDir) {
    logger.warn("Skipping DB update due to missing result data");
    return;
  }

  try {
    await publishProgress(result?.videoId, "hls_done");
    const { hlsS3Path, videoId, masterUrl } = await updateS3VideoHls(
      result.hlsBaseDir,
      result.videoId,
      result.masterUrl
    );
    await updateMongoVideoHls(hlsS3Path, result.hlsBaseDir, videoId, masterUrl);
  } catch (err) {
    logger.error(`Failed to update video metadata: ${err.message}`);
  }
});

worker.on("failed", async (job, err) => {
  logger.error(`HLS Job ${job.id} failed: ${err.message}`);
});
