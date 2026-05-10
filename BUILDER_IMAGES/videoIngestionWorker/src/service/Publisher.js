import { redisClient } from "../config/redis.js"

let lastPublishTime = 0;

export const publish = async (data) => {
    const now = Date.now();

    if (now - lastPublishTime < 3000) {
        return;
    }

    lastPublishTime = now;

    await redisClient.publish(
        `video:processor:${process.env.VIDEO_ID}`,
        JSON.stringify(data)
    );
}