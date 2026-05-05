import {app} from "./app.js";
import dotenv from "dotenv";
import logger from "./logger/logger.js";
import connectDB from "./db/index.js";
import { env } from "./config/env.js";
import { connectRedis } from "./services/cache.service.js";

dotenv.config({
     path: './.env'
});
const PORT = env.PORT || 3000;

connectDB()
.then(() => {
     connectRedis()
     app.listen(PORT, () => {
          logger.info(`Server is running on port ${PORT}`);
     });
})
.catch((err) => {
     logger.error("Database connection failed:", err);
     process.exit(1);
})