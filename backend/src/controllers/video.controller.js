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
  uploadVideoOnCloudinary,
  deleteVideoFromCloudinary,
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/assets-utils/Cloudinary.js";
import fs from "fs";

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

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!req.user || !req.user._id || !isValidObjectId(req.user._id)) {
    throw new ApiError(400, "User ID is required and must be a valid ObjectId");
  }

  if (!req.files || !req.files.videoFile || !req.files.thumbnail) {
    throw new ApiError(400, "Video file and thumbnail are required");
  }

  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }

  const videoLocalPath = req.files.videoFile[0].path;
  const thumbnailLocalPath = req.files.thumbnail[0].path;
  const outputPath = "./public/output";
  let videoFile = null;
  let thumbnail = null;

  try {
    if (videoLocalPath) {
      videoFile = await uploadVideoOnCloudinary(videoLocalPath);
      if (!videoFile?.url) {
        throw new ApiError(500, "Video upload failed");
      }
    }

    if (thumbnailLocalPath) {
      thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
      if (!thumbnail?.url) {
        await deleteVideoFromCloudinary(videoFile?.public_id);
        throw new ApiError(500, "Thumbnail upload failed");
      }
    }

    const duration = videoFile?.duration || 0;

    const publicId = {
      thumbnail: thumbnail?.public_id || null,
      video: videoFile?.public_id || null,
    };

    const video = new Video({
      videoFile: videoFile?.url,
      thumbnail: thumbnail?.url,
      title,
      description,
      duration,
      owner: req.user._id,
      isPublished: true,
      publicId,
    });

    await video.save();

    await videoQueue.add(
      "video-transcode",
      {
        inputPath: videoLocalPath,
        baseOutputPath: outputPath,
        videoId: video._id,
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

    return res
      .status(201)
      .json(new ApiResponse(201, video, "Video published successfully"));
  } catch (error) {
    console.error("Error publishing video:", error);

    try {
      await fs.promises.unlink(videoLocalPath);
    } catch (err) {
      console.warn("Video local file already deleted or not found.");
    }

    try {
      await fs.promises.unlink(thumbnailLocalPath);
    } catch (err) {
      console.warn("Thumbnail local file already deleted or not found.");
    }

    if (videoFile?.public_id)
      await deleteVideoFromCloudinary(videoFile.public_id);
    if (thumbnail?.public_id) await deleteFromCloudinary(thumbnail.public_id);

    throw new ApiError(500, error.message || "Failed to publish video");
  }
});

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
    console.error("Error updating video:", error);
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
    if (video?.publicId?.video)
      await deleteVideoFromCloudinary(video?.publicId?.video);
  } catch (error) {
    console.error("Error deleting video from Cloudinary:", error);
  }

  try {
    if (video?.publicId?.thumbnail)
      await deleteFromCloudinary(video?.publicId?.thumbnail);
  } catch (error) {
    console.error("Error deleting thumbnail from Cloudinary:", error);
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
    console.error(error);
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
    console.error(error);
    throw new ApiError(500, "Internal server error", error);
  }
});

export {
  getAllPublishedVideos,
  deleteVideo,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
  getAllOwnVideos,
  adaptiveStream,
  progressiveStream,
};
