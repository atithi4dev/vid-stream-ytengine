import { th } from "zod/v4/locales";

export const retry = async (fn, options = {}) => {
    const { retries = 3,
        delay = 1000,
        factor = 2,
        onRetry = () => { }
    } = options;

    let lastError;
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            onRetry(attempt, err);
            if (attempt < retries - 1) {
                const waitTime = delay * Math.pow(factor, attempt);
                await new Promise(res => setTimeout(res, waitTime));
            }
        }
    }
    throw lastError;
}

/*
    USES EXAMPLE- 
    
    import { retry } from "./retry.js";

    await retry(
        async () => {
            await mongoose.connect(process.env.DATABASE_URL);
        },
        {
            retries: 5,
            delay: 1000,
            onRetry: (attempt, err) => {
            logger.info(`DB retry ${attempt}`, err.message);
            }
        }
    );
*/