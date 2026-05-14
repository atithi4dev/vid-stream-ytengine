import dotenv from "dotenv";
dotenv.config();
import redis from "redis";

export const redisClient = redis.createClient({
    username: process.env.CLOUD_REDIS_USERNAME,
    password: process.env.CLOUD_REDIS_PASSWORD,
    socket: {
        host: process.env.CLOUD_REDIS_HOST,
        port: Number(process.env.CLOUD_REDIS_PORT),
    }
})

redisClient.on("error", async (err) => {
    console.error("Redis Client Error", err);
})