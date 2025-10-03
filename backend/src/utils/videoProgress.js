import IORedis from "ioredis";
import Video from '../models/video.models.js'
const pub = new IORedis({
  host: process.env.REDIS_HOST || "yt-redis",
  port: 6379,
});

export const publishProgress = async (videoId, stageKey) => {
  const stages = {
    upload_start: { percent: 0, message: "Upload started..." },
    upload_complete: { percent: 10, message: "Upload completed." },

    transcoding_start: { percent: 15, message: "Processing video..." },
    transcoding_done: { percent: 50, message: "Transcoding complete." },

    hls_start: { percent: 60, message: "Generating video formats..." },
    hls_done: { percent: 100, message: "Video ready to watch" },

    error: { percent: 100, message: "Something went wrong" },
  };

  const stage = stages[stageKey];
  if (!stage) {
    console.warn(`Invalid progress stage: ${stageKey}`);
    return;
  }

  await pub.publish(
    `video-progress:${videoId}`,
    JSON.stringify({
      videoId,
      stage: stageKey,
      percent: stage.percent,
      message: stage.message,
      time: Date.now(),
    })
  );
  try {
    if (stageKey === "transcoding_start") {
      await Video.findByIdAndUpdate(videoId, { encodingStatus: "processing" });
    }

    if (stageKey === "hls_done") {
      await Video.findByIdAndUpdate(videoId, { encodingStatus: "ready" });
    }
  } catch (err) {
    console.warn(`Failed to update encodingStatus for ${videoId}: ${err.message}`);
  }
};
