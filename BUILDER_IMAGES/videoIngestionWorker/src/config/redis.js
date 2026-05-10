import redis from "redis";
import { safeShutdown } from "./shutDown.js";

export const redisClient = redis.createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    } 
})

redisClient.on("error",async (err)=>{
    console.error("Redis Client Error", err);
    await safeShutdown(1, "Redis Client Error");
})

