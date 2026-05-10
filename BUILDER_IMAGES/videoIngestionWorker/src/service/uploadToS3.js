import { s3 } from "../config/S3.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { publish } from "./Publisher.js";

function readDirectoryRecursive(dirPath, baseDir = dirPath) {
    let results = [];

    const list = fs.readdirSync(dirPath);

    list.forEach((file) => {
        const filePath = path.join(dirPath, file);
        const stat = fs.lstatSync(filePath);

        if (stat && stat.isDirectory()) {
            results = results.concat(readDirectoryRecursive(filePath, baseDir));
        } else {
            results.push(path.relative(baseDir, filePath));
        }
    })
    return results;
}

export const uploadFilesToS3 = async (outputDirPath, videoId) => {
    try {
        console.log("Uploading files to S3...");
        const files = readDirectoryRecursive(outputDirPath);

        for (const file of files) {
            const filePath = path.join(outputDirPath, file);

            if (fs.lstatSync(filePath).isDirectory()) continue;

            await s3.send(new PutObjectCommand({
                Bucket: process.env.VIDEO_BUCKET,
                Key: `videos/${videoId}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: file.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : (file.endsWith(".ts") ? "video/mp2t" : "video/mp4"),
            }));
        }
        await publish({
            message: "All files uploaded to S3 successfully",
            state: "ready",
            completionRate: 100,
        });
        console.log("All files uploaded to S3 successfully");
    } catch (error) {
        console.error("Error uploading files to S3:", error);
        throw new Error(`Error uploading files to S3: ${error.message}`);
    }
}