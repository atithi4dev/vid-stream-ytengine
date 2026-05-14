import { isValidObjectId } from "mongoose";
import mongoose from "mongoose";
import Video from "../models/video.models.js";
import Subscription from "../models/subscription.models.js";
import Like from "../models/like.models.js";
import User from "../models/user.models.js";
import { ApiError } from "../utils/api-utils/ApiError.js";
import { ApiResponse } from "../utils/api-utils/ApiResponse.js";
import { asyncHandler } from "../utils/api-utils/asyncHandler.js";
import { videoQueue } from "../Queue/videoProcessor.queue.js";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { attachS3Urls, AWS_CONFIG, s3 } from "../config/s3.js";

import fs from "fs";
import logger from "../logger/logger.js";

const getAllOwnVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, query } = req.query;
  let { sortBy = "createdAt", sortType = "desc" } = req.query;

  const allowedSortTypes = ["asc", "desc"];
  const allowedSortByFields = ["createdat", "duration"];

  page = parseInt(page);
  limit = parseInt(limit);

  if (!page || !limit) {
    throw new ApiError(400, "Page and limit are required and must be valid numbers");
  }

  sortType = sortType.toLowerCase();
  sortBy = sortBy.toLowerCase();

  if (sortType && !allowedSortTypes.includes(sortType)) {
    throw new ApiError(400, `Sort type must be one of ${allowedSortTypes.join(", ")}`);
  }

  if (sortBy && !allowedSortByFields.includes(sortBy)) {
    throw new ApiError(400, `Sort by must be one of ${allowedSortByFields.join(", ")}`);
  }

  let matchStage = {};

  matchStage.owner = new mongoose.Types.ObjectId(req.user._id);

  if (query) {
    const queryWords = query.trim().split(/\s+/); // Split by whitespace(more than one space)
    // $or condition for each word to search in both title and description
    matchStage.$or = queryWords.flatMap((word) => [
      { title: { $regex: word, $options: "i" } },
      { description: { $regex: word, $options: "i" } },
    ])
  }

  if (sortBy === "createdat") {
    sortBy = "createdAt";
  }
  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      }
    },
    {
      $unwind: "$owner",
    },
    {
      $project: {
        _id: 1,
        title: 1,
        videoFile: 1,
        thumbnail: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        createdAt: 1,
        "owner._id": 1,
        "owner.userName": 1,
        "owner.avatar": 1,
      }
    }
  ]

  const options = {
    page: page || 1,
    limit: limit || 30,
    sort: { [sortBy]: sortType === "asc" ? 1 : -1 },
  }

  // Execute the aggregation pipeline with pagination, if await is added here, it will wait for the aggregation to complete before applying pagination, which can lead to performance issues. By passing the aggregate object directly to aggregatePaginate, it allows the pagination to be applied at the database level, optimizing the query execution.

  const aggregate = Video.aggregate(pipeline);
  const result = await Video.aggregatePaginate(aggregate, options);

  if (page > result.totalPages) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Requested page exceeds total pages."));
  }

  const s3DataKeys = ["videoFile", "thumbnail", "owner.avatar"];
  result.docs = attachS3Urls(result.docs, s3DataKeys);

  res
    .status(200)
    .json(new ApiResponse(200, result, "Videos fetched successfully"));
});

const getAllPublishedVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, query, userId } = req.query;
  let { sortBy = "createdAt", sortType = "desc" } = req.query;

  let allowedSortTypes = ["asc", "desc"];
  let allowedSortByFields = ["createdat", "duration"];

  if (userId && !isValidObjectId(userId)) {
    throw new ApiError(400, "User ID is required and must be a valid ObjectId");
  }

  page = parseInt(page);
  limit = parseInt(limit);

  if (!page || !limit) {
    throw new ApiError(400, "Page and limit are required");
  }

  let matchStage = {
    isPublished: true,
  };
  if (userId) {
    matchStage.owner = new mongoose.Types.ObjectId(userId);
  }

  if (query) {
    let queryWords = query.split(" ");
    matchStage.$or = queryWords.flatMap((word) => [
      { title: { $regex: word, $options: "i" } },
      { description: { $regex: word, $options: "i" } },
    ]);
  }

  sortType = sortType.toLowerCase();

  if (!allowedSortTypes.includes(sortType)) {
    throw new ApiError(
      400,
      `Sort type must be one of ${allowedSortTypes.join(", ")}`
    );
  }

  let sortOrder = sortType === "asc" ? 1 : -1;

  sortBy = sortBy.toLowerCase();

  if (!allowedSortByFields.includes(sortBy)) {
    throw new ApiError(
      400,
      `Sort by must be one of ${allowedSortByFields.join(", ")}`
    );
  }

  if (sortBy === "createdat") {
    sortBy = "createdAt";
  }

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $project: {
        _id: 1,
        title: 1,
        thumbnail: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        createdAt: 1,
        "owner._id": 1,
        "owner.userName": 1,
        "owner.avatar": 1,
      },
    },
  ];

  const options = {
    page: page || 1,
    limit: limit || 30,
    sort: { [sortBy]: sortOrder },
  };

  const aggregate = Video.aggregate(pipeline);
  const result = await Video.aggregatePaginate(aggregate, options);
  if (page > result.totalPages) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Requested page exceeds total pages."));
  }

  const s3DataKeys = ["videoFile", "thumbnail", "owner.avatar"];
  result.docs = attachS3Urls(result.docs, s3DataKeys);

  res
    .status(200)
    .json(new ApiResponse(200, result, "Videos fetched successfully"));
});

const getAllPrivateVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10 } = req.query;
  let { sortBy = "createdAt", sortType = "desc" } = req.query;

  let allowedSortTypes = ["asc", "desc"];
  let allowedSortByFields = ["createdat", "duration"];

  const userId = req.user._id;

  if (userId && !isValidObjectId(userId)) {
    throw new ApiError(400, "User ID is required and must be a valid ObjectId");
  }

  page = parseInt(page);
  limit = parseInt(limit);

  if (!page || !limit) {
    throw new ApiError(400, "Page and limit are required");
  }

  let matchStage = {
    isPublished: false,
  };

  matchStage.owner = new mongoose.Types.ObjectId(userId);

  sortType = sortType.toLowerCase();

  if (!allowedSortTypes.includes(sortType)) {
    throw new ApiError(
      400,
      `Sort type must be one of ${allowedSortTypes.join(", ")}`
    );
  }

  let sortOrder = sortType === "asc" ? 1 : -1;

  sortBy = sortBy.toLowerCase();

  if (!allowedSortByFields.includes(sortBy)) {
    throw new ApiError(
      400,
      `Sort by must be one of ${allowedSortByFields.join(", ")}`
    );
  }

  if (sortBy === "createdat") {
    sortBy = "createdAt";
  }

  const pipeline = [
    { $match: matchStage },

    {
      $sort: {
        [sortBy]: sortOrder,
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },

    {
      $unwind: "$owner",
    },

    {
      $project: {
        _id: 1,
        title: 1,
        thumbnail: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        createdAt: 1,
        "owner._id": 1,
        "owner.userName": 1,
        "owner.avatar": 1,
      },
    },
  ];

  const options = {
    page: page || 1,
    limit: limit || 30,
    sort: { [sortBy]: sortOrder },
  };

  const aggregate = Video.aggregate(pipeline);
  const result = await Video.aggregatePaginate(aggregate, options);
  if (
    result.totalPages !== 0 &&
    page > result.totalPages
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Requested page exceeds total pages."));
  }

  const s3DataKeys = ["videoFile", "thumbnail", "owner.avatar"];
  const newRes = attachS3Urls(result.docs, s3DataKeys);

  res
    .status(200)
    .json(new ApiResponse(200, newRes, "Videos fetched successfully"));
});

const videoSignedUrl = asyncHandler(async (req, res) => {
  let video;
  try {
    if (!req.user || !req.user._id || !isValidObjectId(req.user._id)) {
      throw new ApiError(400, "User ID is required and must be a valid ObjectId");
    }

    const { videoFilename, thumbnailFilename, title, description, videoFileType, thumbnailFileType } = req.body;

    if (
      !videoFilename ||
      !videoFileType ||
      !thumbnailFilename ||
      !thumbnailFileType ||
      !title ||
      !description
    ) {
      throw new ApiError(400, "Required fields: videoFilename, title, description, videoFileType");
    };

    if (!videoFileType.startsWith("video/")) {
      throw new ApiError(400, "Invalid videoFile type. Only video files are allowed.");
    }
    if (!thumbnailFileType.startsWith("image/")) {
      throw new ApiError(400, "Invalid thumbnailFile type. Only image files are allowed.");
    }
    video = await Video.create({
      title,
      description,
      owner: req.user._id,
      encodingStatus: "pending_upload",
    })

    const videoExt = videoFileType.split("/")[1];
    const videoKey = `videos/${video._id}/${video._id}.${videoExt}`;

    const thumbnailExt = thumbnailFileType.split("/")[1];
    const thumbnailKey = `thumbnails/${video._id}.${thumbnailExt}`;

    const videoCommand = new PutObjectCommand({
      Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
      Key: videoKey,
      ContentType: videoFileType,
    });

    const thumbnailCommand = new PutObjectCommand({
      Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
      Key: thumbnailKey,
      ContentType: thumbnailFileType,
    });

    const videoUploadUrl = await getSignedUrl(
      s3,
      videoCommand,
      {
        expiresIn: 60 * 5
      }
    );

    const thumbnailUploadUrl = await getSignedUrl(
      s3,
      thumbnailCommand,
      {
        expiresIn: 60 * 5
      }
    );

    video.videoFile = videoKey;
    video.thumbnail = thumbnailKey;

    await video.save();

    res.status(200).json(new ApiResponse(200, { videoUploadUrl, thumbnailUploadUrl, videoId: video._id }, "Signed URLs generated successfully"));
  } catch (error) {
    logger.error("Error generating signed URL:", error);
    if (video?._id) {
      await Video.findByIdAndDelete(video._id);
    }
    res.status(500).json(new ApiError(500, error.message || "Failed to generate signed URL"));
  }
})

const verifyVideoUpload = asyncHandler(async (req, res) => {

  if (!req.user || !req.user._id || !isValidObjectId(req.user._id)) {
    throw new ApiError(400, "User ID is required and must be a valid ObjectId");
  }

  const videoId = req.params.videoId;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Video ID is required and must be a valid ObjectId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json(
        new ApiResponse(
          403,
          null,
          "Not Authorized to verify upload of this video"
        )
      );
  }

  if (video.encodingStatus !== "pending_upload") {
    throw new ApiError(400, "Video upload cannot be verified in its current state");
  }
  if (!video.videoFile || !video.thumbnail) {
    throw new ApiError(400, "Video file or thumbnail information is missing in the video document");
  }

  try {
    const videoS3Res = await s3.send(new HeadObjectCommand({
      Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
      Key: video.videoFile,
    }));

    const thumbnailS3Res = await s3.send(new HeadObjectCommand({
      Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
      Key: video.thumbnail,
    }));

    if (
      !videoS3Res.ContentLength || videoS3Res.ContentLength <= 0 ||
      !thumbnailS3Res.ContentLength || thumbnailS3Res.ContentLength <= 0
    ) {
      video.encodingStatus = "failed";
      await video.save();
      throw new Error("Empty upload");
    }

    const baseKey = `videos/${videoId}`;

    video.hls = {
      masterUrl: `${baseKey}/hls/master.m3u8`,
      resolutions: {
        "1080p": { videoUrl: `${baseKey}/1080p.mp4` },
        "720p": { videoUrl: `${baseKey}/720p.mp4` },
        "360p": { videoUrl: `${baseKey}/360p.mp4` },
      }
    }
    video.encodingStatus = "queued";
    await video.save();

    // Queue
    await videoQueue.add(
      "video-processing",
      {
        videoId: video._id,
        videoFileKey: video.videoFile,
      },
      {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      }
    );


    return res.status(200).json(new ApiResponse(200, video, "Video upload verified and queued for encoding"));
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(500, error.message || "Error verifying video upload"));
  }
})

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(
      400,
      "Video ID is required and must be a valid ObjectId"
    );
  }

  const video = await Video.findById(videoId)
    .populate("owner", "_id userName avatar")
    .lean();

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const userId = req.user?._id;
  const user = await User.findById(userId);
  const alreadyWatched = user.watchHistory.some(
    (id) => id.toString() === videoId.toString()
  );

  if (!alreadyWatched) {
    user.watchHistory.push(videoId);
    await user.save();
    await Video.findByIdAndUpdate(videoId, {
      $inc: { views: 1 },
    });
  }

  let isLikedByUser = false;
  isLikedByUser = (await Like.exists({
    targetType: "Video",
    targetId: videoId,
    likedBy: req.user._id,
  }))
    ? true
    : false;

  const videoLikesCount = await Like.countDocuments({
    targetType: "Video",
    targetId: videoId,
  });

  let isOwnerSubscribed = false;
  isOwnerSubscribed = (await Subscription.exists({
    subscriber: req.user._id,
    channel: video.owner,
  }))
    ? true
    : false;

  const s3DataKeys = [
    "videoFile",
    "thumbnail",
    "owner.avatar",
    "hls.masterUrl",
    "hls.resolutions.1080p.videoUrl",
    "hls.resolutions.720p.videoUrl",
    "hls.resolutions.360p.videoUrl",
  ];
  const videoObj = attachS3Urls(video, s3DataKeys);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...videoObj,
        likeCount: videoLikesCount,
        isLikedByUser,
        isOwnerSubscribed,
      },
      "Video fetched successfully"
    )
  );
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(
      400,
      "Video ID is required and must be a valid ObjectId"
    );
  }

  let video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json(
        new ApiResponse(
          403,
          null,
          "You are not authorized to update this video"
        )
      );
  }
  if (video.encodingStatus !== "ready") {
    throw new ApiError(400, "Video details can only be updated when video is in ready state");
  }

  if (!title && !description) {
    throw new ApiError(
      400,
      "At least one of title, description must be provided to update."
    );
  }

  try {
    if (title) video.title = title;
    if (description) video.description = description;

    await video.save();

    const s3DataKeys = ["videoFile", "thumbnail"];
    const videoObj = video.toObject();
    video = attachS3Urls(videoObj, s3DataKeys);

    return res
      .status(200)
      .json(new ApiResponse(200, video, "Video details updated successfully"));
  } catch (error) {
    logger.error("Error updating video:", error);
    throw new ApiError(500, error.message || "Unable to update video details");
  }
});

const updateVideoThumbnail = asyncHandler(async (req, res) => {

})
const confirmVideoThumbnailUpdate = asyncHandler(async (req, res) => {

})

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(
      400,
      "Video ID is required and must be a valid ObjectId"
    );
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video.owner.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json(
        new ApiResponse(
          403,
          null,
          "You are not authorized to delete this video"
        )
      );
  }

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
        Key: video.videoFile,
      })
    );
    await s3.send(
      new DeleteObjectCommand({
        Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
        Key: video.thumbnail,
      })
    )

  } catch (error) {
    logger.error("Error deleting video from S3:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Error deleting video file from storage"));
  }

  await Video.findByIdAndDelete(videoId);
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(
      400,
      "Video ID is required and must be a valid ObjectId"
    );
  }

  let video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video.owner.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json(
        new ApiResponse(
          403,
          null,
          "You are not authorized to toggle publish status of this video"
        )
      );
  }
  video.isPublished = !video.isPublished;
  await video.save();

  video = video.toObject();
  const s3DataKeys = ["videoFile", "thumbnail"];
  video = attachS3Urls(video, s3DataKeys);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        video,
        `Video is now ${video.isPublished ? "published" : "unpublished"}`
      )
    );
});

const adaptiveStream = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(
      400,
      "Video ID is required and must be a valid ObjectId"
    );
  }
  try {
    const video = await Video.findById(videoId).lean();
    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    let hls = video.hls;

    if (
      !hls ||
      !hls.masterUrl ||
      !hls.resolutions ||
      Object.keys(hls.resolutions).length === 0
    ) {
      throw new ApiError(404, "Video metaData not found");
    } else {

      const s3DataKeys = ["masterUrl", "resolutions.1080p.playlistUrl", "resolutions.720p.playlistUrl", "resolutions.360p.playlistUrl"];
      hls = attachS3Urls(hls, s3DataKeys);

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            hls,
            "Hls Video Streaming data successfully fetched"
          )
        );
    }
  } catch (error) {
    logger.error(error);
    throw new ApiError(
      500,
      "Internal server error in streaming the hls video",
      error
    );
  }
});

// make it a signed stream url which expires in 1 min, this is to prevent unauthorized access to the video stream url, and also to prevent hotlinking of the video stream url  - CDN APPROACH WILL BE ADDED, afetr other features are implemented, for now this will ensure that only authorized users can access the video stream, and the url will expire after 1 min to prevent misuse.
const progressiveStream = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(
      400,
      "Video ID is required and must be a valid ObjectId"
    );
  }

  try {
    const video = await Video.findById(videoId).lean();
    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    const videoFile = video.videoFile;

    if (!videoFile) {
      throw new ApiError(404, "Video File not found");
    } else {
      return res
        .status(200)
        .json(new ApiResponse(200, videoFile, "Video Fetched SuccessFully"));
    }
  } catch (error) {
    logger.error(error);
    throw new ApiError(500, "Internal server error", error);
  }
});

export {
  getAllPublishedVideos,
  getAllPrivateVideos,
  deleteVideo,
  getVideoById,
  videoSignedUrl,
  verifyVideoUpload,
  togglePublishStatus,
  updateVideo,
  getAllOwnVideos,
  adaptiveStream,
  progressiveStream,
};
