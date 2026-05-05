import express from "express";

import cors from "cors";
import cookieParser from "cookie-parser";

import { requestTimeout } from "./middlewares/apiRequestTimeout.middlewares.js";
import { errorHandler } from "./middlewares/error.middlewares.js";
import morganMiddleware from "./logger/indexLog.js";
import { env } from "./config/env.js";

import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

const app = express();

app.use(helmet({
     contentSecurityPolicy: false
}));

app.use(compression());

app.use(morganMiddleware());
app.use(
     cors({
          origin: env.CORS_ORIGIN,
          credentials: true,
     })
);

// Middleware to parse JSON and URL-encoded data along with static files
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }))
app.use(cookieParser());
app.use(express.static('public'));

app.use(rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 400,
     standardHeaders: true,
     legacyHeaders: false
}));

app.use(requestTimeout(30_000));

// Importing routes
import healthCheckRouter from "./routes/healthCheck.routes.js";
import userRouter from "./routes/user.routes.js";
import tweetRouter from "./routes/tweet.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"
import workerRouter from "./routes/worker.routes.js"

// Routes
app.use("/api/v1/healthcheck", healthCheckRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)
app.use("/api/v1/workerRouter", workerRouter)

app.use(errorHandler)

export { app };