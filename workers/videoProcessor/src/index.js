import { Worker } from "bullmq";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs"
import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const ecs = new ECSClient({
    region: process.env.AWS_REGION,
});

const connection = new IORedis({
    host: process.env.WORKER_REDIS_HOST || "yt-redis",
    port: process.env.WORKER_REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
});

const SUBNETS = process.env.SUBNETS?.split(",") || [];
const SECURITY_GROUPS = process.env.SECURITY_GROUPS?.split(",") || [];

if (SUBNETS.length === 0 || SECURITY_GROUPS.length === 0) {
    throw new Error("SUBNETS and SECURITY_GROUPS environment variables must be set");
}

const videoWorker = new Worker("video-processing", async (job) => {
    const { videoId, videoFileKey } = job.data;
    if (!videoId || !videoFileKey) {
        throw new Error("Invalid job data");
    }

    const VIDEO_ID = videoId
    const VIDEO_FILE_KEY = videoFileKey

    const VIDEO_BUCKET = process.env.VIDEO_BUCKET
    const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
    const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
    const AWS_REGION = process.env.AWS_REGION
    const REDIS_USERNAME = process.env.CLOUD_REDIS_USERNAME
    const REDIS_PASSWORD = process.env.CLOUD_REDIS_PASSWORD
    const REDIS_HOST = process.env.CLOUD_REDIS_HOST
    const REDIS_PORT = process.env.CLOUD_REDIS_PORT

    if (!VIDEO_ID ||
        !VIDEO_FILE_KEY ||
        !AWS_ACCESS_KEY_ID ||
        !AWS_SECRET_ACCESS_KEY ||
        !AWS_REGION ||
        !REDIS_USERNAME ||
        !REDIS_PASSWORD ||
        !REDIS_HOST ||
        !REDIS_PORT
    ) {
        throw new Error("Missing required environment variables");
    }

    const envs = {
        VIDEO_ID,
        VIDEO_FILE_KEY,
        VIDEO_BUCKET,
        AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY,
        AWS_REGION,
        REDIS_USERNAME,
        REDIS_PASSWORD,
        REDIS_HOST,
        REDIS_PORT,
    }

    const environment = Object.entries(envs).map(([name, value]) => ({
        name,
        value: String(value),
    }));

    const command = new RunTaskCommand({
        cluster: process.env.ECS_CLUSTER_NAME,
        taskDefinition: process.env.ECS_TASK_DEFINITION,
        launchType: "FARGATE",

        networkConfiguration: {
            awsvpcConfiguration: {
                subnets: SUBNETS,
                securityGroups: SECURITY_GROUPS,
                assignPublicIp: "ENABLED",
            }
        },
        overrides: {
            containerOverrides: [
                {
                    name: process.env.ECS_CONTAINER_NAME,
                    environment: environment
                }
            ]
        }
    })

    const response = await ecs.send(command);

    if (response.failures && response.failures.length > 0) {
        console.error("Failed to start ECS task:", response.failures);
        throw new Error("Failed to start ECS task");
    }
    const taskArn = response.tasks[0].taskArn;
    console.log(`Started ECS task with ARN: ${taskArn} for video ID: ${videoId}`);

    return { message: "Video processing task started", taskArn, videoId };

}, {
    connection
})

videoWorker.on("completed", (job, result) => {
    console.log(`Job ${job.id} completed successfully`, result);
})

videoWorker.on("failed", (job, err) => {
    console.error(`Job ${job.id} failed with error:`, err);
})

videoWorker.on("error", (err) => {
    console.error("Worker error:", err);
})