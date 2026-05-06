import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env.js";

export const s3 = new S3Client({
    region: env.AWS_REGION,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
});

export const AWS_CONFIG = {
    AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: env.AWS_REGION,
    AWS_S3_BUCKET_NAME: env.AWS_S3_BUCKET_NAME,
};