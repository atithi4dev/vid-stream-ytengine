import Video from "../models/video.models.js"
import { ApiError } from "../utils/api-utils/ApiError.js";
import path from "path";
import fs from "fs/promises";
import { ApiResponse } from "../utils/api-utils/ApiResponse.js";
import logger from "../logger/logger.js";

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
            logger.warn(
                `Skipping HLS resolution ${res} for video ${videoId}: ${err.message}`
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

const uploadonmongodb = async (req, res) => {
    const { hlsS3Path,
        hlsLocalPath,
        videoId,
        masterUrl } = req.body;
    try {
        const data = await getAllHLSMetadata(hlsS3Path, hlsLocalPath, videoId);
        const response = await Video.findByIdAndUpdate(videoId, {
            hls: {
                masterUrl,
                resolutions: data,
            },
        });
        logger.info("Successfully uploaded Video Transcoding and hls metadata");
        return res.status(200).json(new ApiResponse(201, response, "Successfully uploaded Video Transcoding and hls metadata"))
    } catch (err) {
        throw new ApiError(
            500,
            `Failed to update video document with HLS data for videoId: ${videoId}`,
            [],
            err
        );
    }
}

export default uploadonmongodb