import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { performance } from "perf_hooks";

import { generateHLSChunks } from "./service/generateHLSChunks.js";
import { getVideoDuration } from "./service/getVideoDuration.js";
import { getVideoFromS3 } from "./service/getVideoFromS3.js";
import { uploadFilesToS3 } from "./service/uploadToS3.js";
import { redisClient } from "./config/redis.js";
import { publish } from "./service/Publisher.js";
import { safeShutdown } from "./config/shutDown.js";
import { watchdog } from "./config/watchDog.js";

ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");
ffmpeg.setFfprobePath("/usr/bin/ffprobe");

const VIDEO_ID = process.env.VIDEO_ID;
const VIDEO_FILE_KEY = process.env.VIDEO_FILE_KEY;
const VIDEO_BUCKET = process.env.VIDEO_BUCKET;

const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const VIDEO_EXT = process.env.VIDEO_FILE_KEY.split(".").pop();
const VIDEO_PATH = `/tmp/${VIDEO_ID}.${VIDEO_EXT}`;
const OUTPUT_DIR_PATH = `/tmp/${VIDEO_ID}-output`;

async function ingestionWorker() {

    if (
        !VIDEO_ID ||
        !VIDEO_FILE_KEY ||
        !VIDEO_BUCKET ||
        !AWS_REGION ||
        !AWS_ACCESS_KEY_ID ||
        !AWS_SECRET_ACCESS_KEY
    ) {
        throw new Error("Missing required environment variables.");
    }

    await redisClient.connect();

    await fs.promises.mkdir(OUTPUT_DIR_PATH, {
        recursive: true,
    });

    await publish({
        state: "processing",
        message: "Worker started",
        completionRate: 0,
    });
    await getVideoFromS3(VIDEO_BUCKET, VIDEO_FILE_KEY, VIDEO_PATH);

    console.log("Video downloaded from S3, getting video duration...\n");
    await publish({
        message: "Video downloaded from S3, getting video duration...",
        state: "processing",
        completionRate: 5,
    });

    let videoDuration;

    try {
        videoDuration = await getVideoDuration(VIDEO_PATH);
    } catch (err) {
        await publish({
            message: `Error during transcoding: ${err.message}`,
            state: "failed",
            completionRate: 0,
        });

        throw new Error(`Unable to retrieve video duration: ${err.message}`);
    }

    console.log(`Video duration: ${videoDuration} seconds`);

    await publish({
        message: "Video downloaded from S3, getting video duration...",
        state: "processing",
        completionRate: 10,
    });

    const resolutions = [
        { name: "360p", size: "360" },
        { name: "720p", size: "720" },
        { name: "1080p", size: "1080" },
    ];

    const transcodeProgress = {
        "360p": 0,
        "720p": 0,
        "1080p": 0,
    };

    console.log("Starting transcoding to multiple resolutions...");

    const transcodePromises = resolutions.map(({ name, size }) => {

        const outputFile = path.join(OUTPUT_DIR_PATH, `${name}.mp4`);

        return new Promise((resolve, reject) => {
            const start = performance.now();

            ffmpeg(VIDEO_PATH)
                .outputOptions([
                    `-vf scale=-2:${size}`,
                    "-c:v libx264",
                    "-preset veryfast",
                    "-crf 23",
                    "-c:a aac",
                    "-b:a 128k",
                ])
                .on("progress", async (progress) => {
                    transcodeProgress[name] = progress.percent || 0;
                    const avg =
                        Object.values(transcodeProgress)
                            .reduce((a, b) => a + b, 0) / 3;

                    const overall = 10 + (avg * 0.5);

                    await publish({
                        state: "processing",
                        message: "Transcoding video",
                        completionRate: Math.floor(overall),
                    });
                })
                .on("error", async (err) => {
                    await publish({
                        message: `Error during transcoding: ${err.message}`,
                        state: "failed",
                        completionRate: 0,
                    });
                    reject(new Error(`Error transcoding ${name}: ${err.message}`));
                })
                .on("end", () => {
                    const end = performance.now();
                    const encodeTime = ((end - start) / 1000).toFixed(2);
                    console.log(`Encoding time for ${name}: ${encodeTime} seconds`);
                    resolve({ name, encodeTime });
                })
                .save(outputFile);
        })
    });

    let encodingResults;

    try {
        encodingResults = await Promise.all(transcodePromises);

        console.log("All transcoding tasks completed successfully:");

        await publish({
            message: `Finished transcoding all resolutions`,
            state: "transcoded",
            completionRate: 50,
        });

        encodingResults.forEach(({ name, encodeTime }) => {
            console.log(`- ${name}: ${encodeTime} seconds`);
        });

    } catch (err) {
        await publish({
            message: `Error during transcoding: ${err.message}`,
            state: "failed",
            completionRate: 0,
        });
        throw new Error(`Error during transcoding: ${err.message}`);
    }

    console.log("Starting HLS conversion for each transcoded video...");

    const { HLS_BASE_DIR, m3u8Path } = await generateHLSChunks(OUTPUT_DIR_PATH, VIDEO_ID);

    console.log("HLS conversion completed, uploading HLS chunks to S3...");

    await uploadFilesToS3(OUTPUT_DIR_PATH, VIDEO_ID);
}

ingestionWorker()
    .then(async () => {
        clearTimeout(watchdog);
        await safeShutdown(0, "Completed successfully");
    })
    .catch(async (err) => {
        clearTimeout(watchdog);

        console.error("Ingestion worker failed:");
        console.error(err);

        try {
            await publish({
                state: "failed",
                message: err.message,
                completionRate: 0,
            });
        } catch (publishErr) {
            console.error("Failed to publish failure:", publishErr.message);
        }

        await safeShutdown(1, "Worker failed");
    });