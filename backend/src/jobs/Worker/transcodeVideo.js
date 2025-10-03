import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import ffmpeg from "fluent-ffmpeg";
import { ApiError } from "../../utils/ApiError.js";
import { publishProgress } from "../../utils/videoProgress.js";

ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");
ffmpeg.setFfprobePath("/usr/bin/ffprobe");

function getVideoDuration(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        return reject(
          new ApiError(500, "Failed to get video duration", [], err.stack)
        );
      }
      const duration = metadata.format.duration;
      resolve(duration);
    });
  });
}

export const transcodeVideo = async (
  inputPath,
  resolvedOutputPath,
  videoId,
  job
) => {
  let videoDuration;
  try {
    videoDuration = await getVideoDuration(inputPath);
  } catch (err) {
    throw new ApiError(500, "Unable to retrieve video duration", [], err.stack);
  }

  const outputDir = path.join(resolvedOutputPath, videoId);
  try {
    fs.mkdirSync(outputDir, { recursive: true }); 
  } catch (err) {
    throw new ApiError(
      500,
      `Failed to create output directory: ${outputDir}`,
      [],
      err.stack
    );
  }

  const resolutions = [
    { name: "360p", size: "360" },
    { name: "720p", size: "720" },
    { name: "1080p", size: "1080" },
  ];
  publishProgress(videoId, "transcoding_start");

  const transcodePromises = resolutions.map(({ name, size }) => {
    const outputFile = path.join(outputDir, `${name}.mp4`);
    return new Promise((resolve, reject) => {
      const start = performance.now();

      ffmpeg(inputPath)
        .outputOptions([
          `-vf scale=-2:${size}`,
          "-c:v libx264",
          "-preset veryfast",
          "-crf 23",
          "-c:a aac",
          "-b:a 128k",
        ])
        .on("progress", (progress) => {
          const percent = Math.floor(progress.percent);
          job.updateProgress(percent);

        })
        .on("error", (err) => {
          reject(new ApiError(500, `Error transcoding ${name}`, [], err?.stack || ""));
        })
        .on("end", () => {
          const end = performance.now();
          const encodeTime = ((end - start) / 1000).toFixed(2);
          resolve({ name, encodeTime });
        })
        .save(outputFile);
    });
  });

  let encodingResults;
  try {
    encodingResults = await Promise.all(transcodePromises);
    publishProgress(videoId, "transcoding_done");
  } catch (err) {
    publishProgress(videoId, "error");
    throw new ApiError(
      500,
      "One or more resolutions failed to transcode",
      [],
      err.stack
    );
  }

  return {
    metaData: {
      videoDuration,
      encodingResults,
    },
    videoId,
    message: "Transcoding Phase 1 completed",
    inputPath,
    outputDir,
    files: resolutions.map((r) => `${r.name}.mp4`),
  };
};
