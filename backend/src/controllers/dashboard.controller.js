import mongoose from "mongoose";
import Video from "../models/video.models.js";
import Subscription from "../models/subscription.models.js";
import Like from "../models/like.models.js";
import { ApiError } from "../utils/api-utils/ApiError.js";
import { ApiResponse } from "../utils/api-utils/ApiResponse.js";
import { asyncHandler } from "../utils/api-utils/asyncHandler.js";
import { isValidObjectId } from "mongoose";

const getChannelStats = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId) {
    throw new ApiError(400, "Channel ID is required");
  }

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Channel ID must be a valid ObjectId");
  }

  const totalVideos = await Video.countDocuments({
    owner: new mongoose.Types.ObjectId(channelId),
    isPublished: true,
  });

  const totalSubscribers = await Subscription.countDocuments({
    channel: new mongoose.Types.ObjectId(channelId),
  });

  let videos = await Video.find({
    owner: new mongoose.Types.ObjectId(channelId),
    isPublished: true,
  })
    .sort({ views: -1 })
    .lean();

  const videoIds = videos.map((v) => v._id);
  const totalLikes = await Like.countDocuments({
    targetType: "Video",
    targetId: { $in: videoIds },
  });

  const totalViews = videos.reduce((acc, curr) => acc + (curr.views || 0), 0);

  const topTwentyVideos = videos.slice(0, 20);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          totalLikes,
          totalViews,
          totalSubscribers,
          totalVideos,
          topTwentyVideos,
        },
        "Channel stats fetched successfully"
      )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, query, channelId } = req.query;
  let { sortBy = "createdAt", sortType = "desc" } = req.query;

  let allowedSortTypes = ["asc", "desc"];
  let allowedSortByFields = ["createdat", "duration"];

  if (!channelId) {
    throw new ApiError(400, "Channel ID is required");
  }

  if (!isValidObjectId(channelId)) {
    throw new ApiError(
      400,
      "Channel ID is required and must be a valid ObjectId"
    );
  }

  page = parseInt(page);
  limit = parseInt(limit);

  if (!page || !limit) {
    throw new ApiError(400, "Page and limit are required");
  }

  let matchStage = {
    isPublished: true,
  };
  if (channelId) {
    matchStage.owner = new mongoose.Types.ObjectId(channelId);
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

const getTopVideosByTimeframes = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
  if (!channelId) {
    throw new ApiError(400, "Channel ID is required");
  }

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Channel ID must be a valid ObjectId");
  }

  const now = new Date();
  const last7Days = new Date(now);
  last7Days.setDate(now.getDate() - 7);

  const last30Days = new Date(now);
  last30Days.setDate(now.getDate() - 30);

  const last1Year = new Date(now);
  last1Year.setFullYear(now.getFullYear() - 1);

  const timeframes = [
    { label: "last7Days", date: last7Days },
    { label: "last30Days", date: last30Days },
    { label: "last1Year", date: last1Year },
  ];

  const results = {};

  for (const timeframe of timeframes) {
    const videos = await Video.find({
      owner: new mongoose.Types.ObjectId(channelId),
      isPublished: true,
      createdAt: { $gte: timeframe.date },
    })
      .sort({ views: -1 })
      .limit(5)
      .lean();

    results[timeframe.label] = videos;
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      results,
      "Top videos for different timeframes fetched successfully"
    )
  );
});

export { getChannelStats, getChannelVideos, getTopVideosByTimeframes };
