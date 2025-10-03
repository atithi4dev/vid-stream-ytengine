import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { ApiError } from "../../../utils/ApiError.js";
import logger from "../../../logger/logger.js";
import { publishProgress } from "../../../utils/videoProgress.js";

ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");
ffmpeg.setFfprobePath("/usr/bin/ffprobe");

const VIDEO_EXTENSIONS = [
  ".mp4",
  ".mov",
  ".mkv",
  ".avi",
  ".webm",
  ".flv",
  ".wmv",
  ".m4v",
];

const RESOLUTION_MAP = {
  "360p": { bandwidth: 800000, resolution: "640x360" },
  "720p": { bandwidth: 1400000, resolution: "1280x720" },
  "1080p": { bandwidth: 3000000, resolution: "1920x1080" },
};

const ensureDir = async (dirPath) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (err) {
    throw new ApiError(
      500,
      `Failed to create directory: ${dirPath}`,
      [],
      err.stack
    );
  }
};

const generateHLS = (inputFilePath, outputDir) => {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, "index.m3u8");

    ffmpeg(inputFilePath)
      .outputOptions([
        "-profile:v baseline",
        "-level 3.0",
        "-start_number 0",
        "-hls_time 4",
        "-hls_list_size 0",
        "-hls_segment_filename",
        path.join(outputDir, "index%d.ts"),
        "-force_key_frames",
        "expr:gte(t,n_forced*2)",
        "-f hls",
      ])
      .output(outputPath)
      .on("start", () => {
        logger.info(`Starting HLS for ${path.basename(inputFilePath)}`);
      })
      .on("end", () => {
        logger.info(`HLS completed for ${path.basename(inputFilePath)}`);
        resolve();
      })
      .on("error", (err) => {
        logger.error(
          `HLS error for ${path.basename(inputFilePath)}: ${err.message}`
        );
        reject(
          new ApiError(
            500,
            `HLS error during ${path.basename(inputFilePath)}`,
            [],
            err.stack
          )
        );
      })
      .run();
  });
};

const createMasterPlaylist = async (hlsBaseDir, resolutions) => {
  const lines = ["#EXTM3U"];

  for (const res of resolutions) {
    const info = RESOLUTION_MAP[res];
    if (!info) continue;

    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${info.bandwidth},RESOLUTION=${info.resolution}`,
      `${res}/index.m3u8`
    );
  }

  const masterPath = path.join(hlsBaseDir, "master.m3u8");
  try {
    await fs.promises.writeFile(masterPath, lines.join("\n"));
  } catch (err) {
    throw new ApiError(
      500,
      "Failed to write master.m3u8 playlist",
      [],
      err.stack
    );
  }
  return masterPath;
};

export const generateHLSChunks = async (outputDir, videoId) => {
  const hlsBaseDir = path.join(outputDir, "hls");
  await ensureDir(hlsBaseDir);

  let files;
  try {
    files = await fs.promises.readdir(outputDir);
  } catch (err) {
    throw new ApiError(
      500,
      `Failed to read output directory: ${outputDir}`,
      [],
      err.stack
    );
  }

  const videoFiles = files.filter((file) =>
    VIDEO_EXTENSIONS.includes(path.extname(file).toLowerCase())
  );

  const resolutions = [];
  publishProgress(videoId, "hls_start");
  const tasks = videoFiles.map(async (file) => {
    const resolution = path.parse(file).name;
    const inputFile = path.join(outputDir, file);
    const outputResDir = path.join(hlsBaseDir, resolution);

    await ensureDir(outputResDir);

    await generateHLS(inputFile, outputResDir);

    resolutions.push(resolution);

    try {
      await fs.promises.access(inputFile, fs.constants.F_OK);
      await fs.promises.unlink(inputFile);
      logger.info(`Deleted original file: ${file}`);
    } catch (err) {
      if (err.code === "ENOENT") {
        logger.warn(`File already deleted or not found: ${file}`);
      } else {
        logger.error(`Error deleting file: ${file}`, err);
      }
    }
  });

  try {
    await Promise.all(tasks);
  } catch (err) {
    publishProgress(videoId, "error");
    throw new ApiError(
      500,
      `Failed during HLS chunk generation`,
      [],
      err.stack
    );
  }

  const masterUrl = await createMasterPlaylist(hlsBaseDir, resolutions);

  return {
    videoId,
    message: "All HLS chunks generated and OutDir direct VideoFiles deleted",
    masterUrl,
    hlsBaseDir: hlsBaseDir,
  };
};
