import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/S3.js";

export const getVideoFromS3 = async (bucketName, videoFileKey, downloadPath) => {
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: videoFileKey
        });

        const response = await s3.send(command);

        if (!response.Body) {
            throw new Error(`No data received for ${videoFileKey} from S3`);
        }

        await fs.promises.mkdir(path.dirname(downloadPath), { recursive: true });

        const WriteStream = fs.createWriteStream(downloadPath);

        await new Promise((resolve, reject) => {
            response.Body
                .pipe(WriteStream)
                .on("finish", resolve)
                .on("error", reject)
        });

        return downloadPath;
    } catch (err) {
        throw new Error(`Failed to download ${videoFileKey} from S3: ${err.message}`);
    }
}