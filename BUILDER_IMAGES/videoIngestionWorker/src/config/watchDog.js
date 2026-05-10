import { publish } from "../service/Publisher.js";

const WORKER_TIMEOUT_MS = 30 * 60 * 1000;

export const watchdog = setTimeout(async () => {
    console.error("Worker timeout exceeded (30 minutes)");

    try {
        await publish({
            state: "failed",
            message: "Worker timed out after 30 minutes",
            completionRate: 0,
        });
    } catch (err) {
        console.error("Failed to publish timeout:", err.message);
    }

    await safeShutdown(1, "Watchdog timeout");
}, WORKER_TIMEOUT_MS);
