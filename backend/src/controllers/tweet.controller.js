import mongoose, { isValidObjectId } from "mongoose";
import Tweet from "../models/tweet.models.js";
import { ApiError } from "../utils/api-utils/ApiError.js";
import { ApiResponse } from "../utils/api-utils/ApiResponse.js";
import { asyncHandler } from "../utils/api-utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  try {
    const { content } = req.body;
    const owner = req.user._id;

    if (!content || content.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Content is required to create a tweet",
      });
    }

    const tweet = await Tweet.create({ content, owner });

    res
      .status(201)
      .json(new ApiResponse(201, tweet, "Tweet created successfully"));
  } catch (error) {
    throw new ApiError(500, "Tweet creation failed", error);
  }
});

const getUserTweets = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    if (mongoose.isValidObjectId(userId) === false) {
      throw new ApiError(400, "Invalid user ID");
    }

    const tweets = await Tweet.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },{
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "targetId",
          as: "likes",
          pipeline: [
            {
              $match: {
                targetType: "Tweet",
                likedBy: new mongoose.Types.ObjectId(req.user._id),
              },
            },
          ],
        },
      },
      {
        $project: {
          content: 1,
          createdAt: 1,
          "userDetails.username": 1,
          "userDetails.avatar": 1,
          liked: {
            $gt: [{ $size: "$likes" }, 0],
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return res
      .status(200)
      .json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
  } catch (error) {
    throw new ApiError(500, "Failed to fetch user tweets", error);
  }
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;
  const owner = req.user._id;
  if (!owner) {
    throw new ApiError(400, "Unauthorized user");
  }
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Content is required to update a tweet");
  }
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
  if (tweet.owner.toString() !== owner.toString()) {
    throw new ApiError(403, "You are not authorized to update this tweet");
  }
  tweet.content = content;
  await tweet.save();
  res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const owner = req.user._id;
  if (!owner) {
    throw new ApiError(400, "Unauthorized user");
  }
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
  if (tweet.owner.toString() !== owner.toString()) {
    throw new ApiError(403, "You are not authorized to update this tweet");
  }

  await tweet.deleteOne();
  res
    .status(200)
    .json(new ApiResponse(200, null, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
