import { isValidObjectId } from "mongoose";
import Like from "../models/like.models.js";
import Tweet from "../models/tweet.models.js";
import Comment from "../models/comment.models.js";
import Video from "../models/video.models.js";
import { ApiError } from "../utils/api-utils/ApiError.js";
import { ApiResponse } from "../utils/api-utils/ApiResponse.js";
import { asyncHandler } from "../utils/api-utils/asyncHandler.js";


const likeToggler = async (req, res, targetType, targetId) => {
  if (!targetType || !targetId) {
    throw new ApiError(400, "Target type and ID are required");
  }
  
  const userId = req.user._id;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  if (!isValidObjectId(targetId)) {
    throw new ApiError(400, "Invalid target ID");
  }

  const existingLike = await Like.findOne({
    likedBy: userId,
    targetType,
    targetId,
  });

  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });

    return res
      .status(200)
      .json(new ApiResponse(200, { liked: false }, "Like removed successfully"));
  } else {
    const newLike = await Like.create({
      likedBy: userId,
      targetType,
      targetId,
    });

    return res.status(201).json(
      new ApiResponse(201, {
        liked: true,
        like: newLike,
      }, "Like added successfully")
    );
  }
};

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const targetExists = await Video.findById(videoId);

  if (!targetExists) {
    throw new ApiError(404, "Video not found");
  }

  await likeToggler(req, res, "Video", videoId);
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const targetExists = await Comment.findById(commentId);
  
  if (!targetExists) {
    throw new ApiError(404, "Comment not found");
  }
  
  await likeToggler(req, res, "Comment", commentId);
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const targetExists = await Tweet.findById(tweetId);

  if (!targetExists) {
    throw new ApiError(404, "Tweet not found");
  }

  await likeToggler(req, res, "Tweet", tweetId);
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const videos = await Like.find({
    likedBy: userId,
    targetType: "Video",
  }).populate({
    path: "targetId",
    model: "Video",
  })

  return res
    .status(200)
    .json(new ApiResponse(200,videos, "Liked videos fetched successfully"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
