import { isValidObjectId } from "mongoose";
import mongoose from "mongoose";
import Video from "../models/video.models.js";
import Subscription from "../models/subscription.models.js";
import Like from "../models/like.models.js";
import User from "../models/user.models.js";
import { ApiError } from "../utils/api-utils/ApiError.js";
import { ApiResponse } from "../utils/api-utils/ApiResponse.js";
import { asyncHandler } from "../utils/api-utils/asyncHandler.js";
import { videoQueue } from "../jobs/Queue/videoProcessor.queue.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/assets-utils/Cloudinary.js";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { AWS_CONFIG, s3 } from "../config/s3.js";

import fs from "fs";
import logger from "../logger/logger.js";

const getAllOwnVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, query } = req.query;
  let { sortBy = "createdAt", sortType = "desc" } = req.query;

  let allowedSortTypes = ["asc", "desc"];
  let allowedSortByFields = ["createdat", "duration"];

  page = parseInt(page);
  limit = parseInt(limit);
  if (!page || !limit) {
    throw new ApiError(400, "Page and limit are required");
  }

  let matchStage = {};
  matchStage.owner = req.user._id;

  if (query) {
    const queryWords = query.trim().split(/\s+/);
    matchStage.$or = await queryWords.flatMap((word) => [
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
        "owner.profilePicture": 1,
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
        "owner.profilePicture": 1,
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

  res
    .status(200)
    .json(new ApiResponse(200, result, "Videos fetched successfully"));
});

const videoSignedUrl = asyncHandler(async (req, res) => {
  try {
    if (!req.user || !req.user._id || !isValidObjectId(req.user._id)) {
      throw new ApiError(400, "User ID is required and must be a valid ObjectId");
    }

    const { filename, title, description, fileType } = req.body;

    if (!filename || !title || !description || !fileType) {
      throw new ApiError(400, "Filename, title, description and fileType are required");
    };

    if (!fileType.startsWith("video/")) {
      throw new ApiError(400, "Invalid file type. Only video files are allowed.");
    }

    const video = await Video.create({
      title,
      description,
      owner: req.user._id,
      encodingStatus: "pending_upload",
    })

    const ext = fileType.split("/")[1];
    const key = `videos/${video._id}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(
      s3,
      command,
      {
        expiresIn: 60 * 5
      }
    )

    video.videoFile = key;
    await video.save();

    res.status(200).json(new ApiResponse(200, { uploadUrl, videoId: video._id }, "Signed URL generated successfully"));
  } catch (error) {
    logger.error("Error generating signed URL:", error);
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
  try {
    const s3Res = await s3.send(new HeadObjectCommand({
      Bucket: AWS_CONFIG.AWS_S3_BUCKET_NAME,
      Key: video.videoFile,
    }));

    if (!s3Res.ContentLength || s3Res.ContentLength <= 0) {
      video.encodingStatus = "failed";
      await video.save();
      throw new Error("Empty upload");
    }

    video.encodingStatus = "queued";

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

    await video.save();

    return res.status(200).json(new ApiResponse(200, video, "Video upload verified and queued for encoding"));
  } catch (error) {
    return res.status(400).json(new ApiError(500, error.message || "Error verifying video upload"));
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
    .populate("owner", "_id userName profilePicture")
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

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...video,
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
          "You are not authorized to update this video"
        )
      );
  }

  const isThumbnailBeingUpdated = req.file?.path;

  if (!title && !description && !isThumbnailBeingUpdated) {
    throw new ApiError(
      400,
      "At least one of title, description, or thumbnail must be provided to update."
    );
  }

  try {
    if (title) video.title = title;
    if (description) video.description = description;

    if (isThumbnailBeingUpdated) {
      const thumbnailLocalPath = req.file.path;
      const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

      if (!thumbnail?.url) {
        throw new ApiError(500, "Thumbnail upload failed");
      }

      await deleteFromCloudinary(video.publicId.thumbnail);

      video.thumbnail = thumbnail.url;
      video.publicId.thumbnail = thumbnail.public_id;
    }

    await video.save();

    return res
      .status(200)
      .json(new ApiResponse(200, video, "Video details updated successfully"));
  } catch (error) {
    logger.error("Error updating video:", error);
    throw new ApiError(500, error.message || "Unable to update video details");
  }
});

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
  } catch (error) {
    logger.error("Error deleting video from S3:", error);
    return res
      .status(500)
      .json(new ApiError(500, "Error deleting video file from storage"));
  }

  try {
    if (video?.publicId?.thumbnail)
      await deleteFromCloudinary(video?.publicId?.thumbnail);
  } catch (error) {
    logger.error("Error deleting thumbnail from Cloudinary:", error);
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
          "You are not authorized to toggle publish status of this video"
        )
      );
  }
  video.isPublished = !video.isPublished;
  await video.save();
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

    const hls = video.hls;

    if (
      !hls ||
      !hls.masterUrl ||
      !hls.resolutions ||
      Object.keys(hls.resolutions).length === 0
    ) {
      throw new ApiError(404, "Video metaData not found");
    } else {
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
