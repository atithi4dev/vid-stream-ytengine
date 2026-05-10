import path from "path";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import { publish } from "./Publisher.js";

const ensureDir = async (dirPath) => {
    try {
        await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
        await publish({
            message: `Error during transcoding: ${error.message}`,
            state: "failed",
            completionRate: 0,
        });
        throw new Error(`Failed to create directory: ${dirPath}, Error: ${error.message}`);
    }
}

const VIDEO_EXTENSIONS = [
    ".mp4",
    ".mov",
    ".mkv",
    ".avi",
    ".webm",
    ".flv",
    ".wmv",
    ".m4v",
]
const hlsProgress = {
    "360p": 0,
    "720p": 0,
    "1080p": 0,
}

const generateHLS = (inputFilePath, outputResDir, resolution) => {
    return new Promise((resolve, reject) => {
        const outputPath = path.join(outputResDir, "index.m3u8");
        ffmpeg(inputFilePath)
            .outputOptions([
                "-profile:v baseline",
                "-level 3.0",
                "-start_number 0",
                "-hls_time 4",
                "-hls_list_size 0",
                "-hls_playlist_type vod",
                "-hls_flags independent_segments",
                "-hls_segment_filename",
                path.join(outputResDir, "segment_%03d.ts"),
                "-force_key_frames",
                "expr:gte(t,n_forced*2)",
                "-f hls",
            ])
            .output(outputPath)
            .on("start", () => {
                console.log(`Starting HLS for ${path.basename(inputFilePath)}`);
            })
            .on("progress", async (progress) => {

                hlsProgress[resolution] = progress.percent || 0;

                const avg =
                    Object.values(hlsProgress)
                        .reduce((a, b) => a + b, 0) / 3;

                const overall = 60 + (avg * 0.3);

                await publish({
                    state: "processing",
                    message: "Generating HLS chunks",
                    completionRate: Math.floor(overall),
                });
            })
            .on("end", () => {
                console.log(`HLS completed for ${path.basename(inputFilePath)}`);
                resolve();
            })
            .on("error", async (err) => {
                await publish({
                    message: `Error during transcoding: ${err.message}`,
                    state: "failed",
                    completionRate: 0,
                });
                console.error(`HLS error for ${path.basename(inputFilePath)}: ${err.message}`);
                reject(new Error(`HLS error for ${path.basename(inputFilePath)}: ${err.message}`));
            })
            .run();
    })
}

const RESOLUTION_MAP = {
    "360p": { bandwidth: 800000, resolution: "640x360" },
    "720p": { bandwidth: 1400000, resolution: "1280x720" },
    "1080p": { bandwidth: 3000000, resolution: "1920x1080" },
};

const createMasterPlaylist = async (HLS_BASE_DIR, resolutions) => {

    const lines = ["#EXTM3U", "#EXT-X-VERSION:3"];

    for (const res of resolutions) {
        const info = RESOLUTION_MAP[res];

        if (!info) continue;

        lines.push(
            `#EXT-X-STREAM-INF:BANDWIDTH=${info.bandwidth},RESOLUTION=${info.resolution}`,
            `${res}/index.m3u8`
        );
    }
    const masterPath = path.join(HLS_BASE_DIR, "master.m3u8");
    try {
        await fs.promises.writeFile(masterPath, lines.join("\n"));
    } catch (error) {
        await publish({
            message: `Error during transcoding: ${error.message}`,
            state: "failed",
            completionRate: 0,
        });
        throw new Error(`Failed to create master playlist: ${error.message}`);
    }
    return masterPath;
}

export const generateHLSChunks = async (OUTPUT_DIR_PATH, VIDEO_ID) => {
    const HLS_BASE_DIR = path.join(OUTPUT_DIR_PATH, "hls");
    await ensureDir(HLS_BASE_DIR);

    let files;
    try {
        files = await fs.promises.readdir(OUTPUT_DIR_PATH);
    } catch (error) {
        await publish({
            message: `Error during transcoding: ${error.message}`,
            state: "failed",
            completionRate: 0,
        });
        throw new Error(`Failed to read output directory: ${OUTPUT_DIR_PATH}, Error: ${error.message}`);
    }

    const videoFiles = files.filter((file) => VIDEO_EXTENSIONS.includes(path.extname(file).toLowerCase()))

    const tasks = videoFiles.map(async (file) => {
        const resolution = path.parse(file).name;

        const inputFilePath = path.join(OUTPUT_DIR_PATH, file);

        const outputResDir = path.join(HLS_BASE_DIR, resolution);
        await ensureDir(outputResDir);

        await generateHLS(inputFilePath, outputResDir, resolution);

    })

    const resolutions = videoFiles.map(
        file => path.parse(file).name
    );

    try {
        await Promise.all(tasks);
    } catch (error) {
        await publish({
            message: `Error during transcoding: ${error.message}`,
            state: "failed",
            completionRate: 0,
        });
        throw new Error(`Failed to generate HLS chunks for ${VIDEO_ID}: ${error.message}`);
    }

    const m3u8Path = await createMasterPlaylist(HLS_BASE_DIR, resolutions);

    return {
        HLS_BASE_DIR,
        m3u8Path
    }
}