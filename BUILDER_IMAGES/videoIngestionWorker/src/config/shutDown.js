import { redisClient } from "./redis.js";

let shuttingDown = false;

export async function safeShutdown(code = 0, reason = "Unknown") {
    if (shuttingDown) return;

    shuttingDown = true;

    console.log(`Shutting down worker: ${reason}`);

    try {
        await redisClient.quit();
    } catch (err) {
        console.error("Failed to close Redis:", err.message);
    }

    process.exit(code);
}