import mongoose, { isValidObjectId } from "mongoose";
import Comment from "../models/comment.models.js";
import { ApiError } from "../utils/api-utils/ApiError.js";
import { ApiResponse } from "../utils/api-utils/ApiResponse.js";
import { asyncHandler } from "../utils/api-utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Please provide a valid video ID");
  }
  const pipeline = [
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    {
      $unwind: "$video",
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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "targetId",
        as: "likes",
        pipeline: [
          {
            $match: {
              targetType: "Comment",
              likedBy: new mongoose.Types.ObjectId(req.user._id),
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        "owner._id": 1,
        "owner.username": 1,
        "video._id": 1,
        "video.title": 1,
        liked: {
          $gt: [{ $size: "$likes" }, 0],
        },
      },
    },
  ];

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
  };
  const comments = await Comment.aggregatePaginate(pipeline, options);

  if (!comments) {
    throw new ApiError(404, "No comments found for this video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});
const getTweetComments = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Please provide a valid tweet ID");
  }
  const pipeline = [
    {
      $match: {
        tweet: new mongoose.Types.ObjectId(tweetId),
      },
    },
    {
      $lookup: {
        from: "tweets",
        localField: "tweet",
        foreignField: "_id",
        as: "tweet",
      },
    },
    {
      $unwind: "$tweet",
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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "targetId",
        as: "likes",
        pipeline: [
          {
            $match: {
              targetType: "Comment",
              likedBy: new mongoose.Types.ObjectId(req.user._id),
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        "owner._id": 1,
        "owner.username": 1,
        "tweet._id": 1,
        "tweet.content": 1,
        liked: {
          $gt: [{ $size: "$likes" }, 0],
        },
      },
    },
  ];

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
  };
  const comments = await Comment.aggregatePaginate(pipeline, options);

  if (!comments) {
    throw new ApiError(404, "No comments found for this video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  const owner = req.user._id;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Please provide a valid video ID");
  }
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment content cannot be empty");
  }
  const comment = await Comment.create({
    video: new mongoose.Types.ObjectId(videoId),
    owner: new mongoose.Types.ObjectId(owner),
    content: content.trim(),
  });

  if (!comment) {
    throw new ApiError(500, "Failed to add comment");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const addTweetComment = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;
  const owner = req.user._id;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Please provide a tweet tweet ID");
  }
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment content cannot be empty");
  }
  const comment = await Comment.create({
    tweet: new mongoose.Types.ObjectId(tweetId),
    owner: new mongoose.Types.ObjectId(owner),
    content: content.trim(),
  });

  if (!comment) {
    throw new ApiError(500, "Failed to add comment");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Please provide a valid comment ID");
  }
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment content cannot be empty");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if (req.user._id.toString() !== comment.owner.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }

  comment.content = content.trim();
  const updatedComment = await comment.save();
  if (!updatedComment) {
    throw new ApiError(500, "Failed to update comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Please provide a valid comment ID");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (req.user._id.toString() !== comment.owner.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  const deletedComment = await Comment.findByIdAndDelete(commentId);

  return res
    .status(200)
    .json(new ApiResponse(200, deletedComment, "Comment deleted successfully"));
});

export {
  getVideoComments, getTweetComments, addTweetComment, addComment, updateComment, deleteComment
};





