import { z } from "zod";
import dotenv from "dotenv";
import { JWT_CONFIG } from "./jwt";

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    PORT: z.enum().default(8001),

    CORS_ORIGIN: z.string().url(),

    MONGO_URI: z.string().min(1),

    ACCESS_TOKEN_SECRET: z.string().min(JWT_CONFIG.MIN_SECRET_LENGTH),
    REFRESH_TOKEN_SECRET: z.string().min(JWT_CONFIG.MIN_SECRET_LENGTH),

    ACCESS_TOKEN_EXPIRY: z.string().min(1),
    REFRESH_TOKEN_EXPIRY: z.string().min(1),

    CLOUDINARY_CLOUD_NAME: z.string().min(1),
    CLOUDINARY_API_KEY: z.string().min(1),
    CLOUDINARY_API_SECRET: z.string().min(1),
    CLOUDINARY_URL: z.string().min(1),

    REDIS_HOST: z.string().min(1),
    REDIS_PORT: z.enum().default(6379),

    AWS_REGION: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),
    
})

const result = envSchema.safeParse(process.env);

if (!result.success) {

    console.error("Invalid environment variables", result.error.flatten().fieldErrors);
    process.exit(1);

}

export const env = result.data;