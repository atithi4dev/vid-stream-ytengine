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

const BASE_URL = `https://${AWS_CONFIG.AWS_S3_BUCKET_NAME}.s3.${AWS_CONFIG.AWS_REGION}.amazonaws.com`;
const toS3Url = (key) => {
    if (!key) return null;
    if (key.startsWith("http://") || key.startsWith("https://")) {
        return key;
    }
    return `${BASE_URL}/${key}`;
}

const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) =>
        current != null ? current[key] : undefined, obj);
};

const setNestedValue = (obj, path, value) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
        if (current[key] == null) current[key] = {};
        return current[key];
    }, obj);
    target[lastKey] = value;
};

export const attachS3Urls = (obj, keys = []) => {
    const transformOne = (obj) => {
        if (!obj) return obj;

        const result = { ...obj };
        for (const key of keys) {
            const value = getNestedValue(result, key);
            if (value) {
                setNestedValue(result, key, toS3Url(value));
            }
        }
        return result;
    };

    return Array.isArray(obj) ? obj.map(transformOne) : transformOne(obj);
};