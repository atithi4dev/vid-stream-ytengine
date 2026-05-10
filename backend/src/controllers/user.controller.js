import { asyncHandler } from "../utils/api-utils/asyncHandler.js";
import { ApiError } from "../utils/api-utils/ApiError.js";
import User from "../models/user.models.js";
import mongoose, { isValidObjectId } from "mongoose";
import { ApiResponse } from "../utils/api-utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import path from 'path';
import { env } from "../config/env.js";
import { JWT_CONFIG } from "../config/jwt.js";

import logger from "../logger/logger.js";

import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { attachS3Urls, s3 } from "../config/s3.js";

const generateAccessAndRefreshToken = async (userId) => {
  if (!userId) {
    throw new ApiError(400, "User ID is required to generate tokens");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const refreshToken = await user.generateRefreshToken();
  const accessToken = await user.generateAccessToken();

  if (!accessToken || !refreshToken) {
    throw new ApiError(500, "Failed to generate access or refresh token");
  }
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  return {
    accessToken,
    refreshToken,
  };
};

const registerUser = asyncHandler(async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    throw new ApiError(400, `All fields are required.`);
  }

  let { userName, email, fullName, password } = req.body;
  userName = userName.toLowerCase(); 
  
  ["fullName", "userName", "email", "password"].forEach((field) => {
    if (!req.body[field]?.trim()) {
      throw new ApiError(400, `All fields are required.`);
    }
  });

  const existingUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existingUser) {
    throw new ApiError(400, "User already exists with this username or email");
  }

  // Create User
  try {
    const user = await User.create({
      fullName,
      userName: userName.toLowerCase(),
      email,
      password,
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new ApiError(500, "User creation failed");
    }
    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User registered successfully"));
  } catch (error) {
    logger.error("User Creation Failed:", error);
    throw new ApiError(
      500,
      "User creation failed. Please try again later.",
    );
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, userName, password } = req.body;

  // validation
  if ((!email && !userName) || !password) {
    throw new ApiError(400, "All fields are required.");
  }

  // find user

  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found with this username or email");
  }

  // validate password
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -pendingAvatar -pendingCoverImage"
  );

  if (!loggedInUser) {
    throw new ApiError(500, "User login failed");
  }

  const s3DataKeys = ["avatar", "coverImage"];
  let loggedInUserObj = loggedInUser.toObject();
  loggedInUserObj = attachS3Urls(loggedInUserObj, s3DataKeys);

  return res
    .status(200)
    .cookie("accessToken", accessToken, JWT_CONFIG.COOKIE_OPTIONS)
    .cookie("refreshToken", refreshToken, JWT_CONFIG.COOKIE_OPTIONS)
    .json(
      new ApiResponse(200, {
        user: loggedInUserObj,
        accessToken,
        refreshToken,
      })
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: null,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  let incomingRefreshToken = req.cookies.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(404, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    res
      .status(200)
      .cookie("accessToken", accessToken, JWT_CONFIG.COOKIE_OPTIONS)
      .cookie("refreshToken", newRefreshToken, JWT_CONFIG.COOKIE_OPTIONS)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    logger.error("Error refreshing access token:", error);
    throw new ApiError(500, "Failed to refresh access token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordValid = await user.isPasswordCorrect(currentPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Current password is incorrect");
  }

  user.password = newPassword;
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .cookie("accessToken", accessToken, JWT_CONFIG.COOKIE_OPTIONS)
    .cookie("refreshToken", refreshToken, JWT_CONFIG.COOKIE_OPTIONS)
    .json(
      new ApiResponse(
        200,
        {
          refreshToken,
          accessToken,
        },
        "Password changed successfully"
      )
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id || !isValidObjectId(req.user._id)) {
    throw new ApiError(404, "User not found");
  }

  const user = await User.findById(req.user._id).select(
    "-password -refreshToken -pendingAvatar -pendingCoverImage"
  );

  const s3DataKeys = ["avatar", "coverImage"];
  let userObj = user.toObject();
  userObj = attachS3Urls(userObj, s3DataKeys);

  res.status(200).json(new ApiResponse(200, userObj, "Current user details."));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  let { fullName, userName } = req.body;

  if (!fullName && !userName) {
    throw new ApiError(
      400,
      "At least one field (full name or username) is required."
    );
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const updateFields = {};

  if (fullName) {
    fullName = fullName.trim();
    updateFields.fullName = fullName;
  }

  if (userName) {
    userName = userName.trim();
    const existingUser = await User.findOne({
      userName: userName.toLowerCase(),
    });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      throw new ApiError(400, "Username already exists");
    }
    updateFields.userName = userName.toLowerCase();
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { new: true }
  ).select("-password -refreshToken");

  const s3DataKeys = ["avatar", "coverImage"];
  let updatedUserObj = updatedUser.toObject();
  updatedUserObj = attachS3Urls(updatedUserObj, s3DataKeys);

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUserObj, "Account details updated successfully")
    );
});

const profileImageSignedUrl = asyncHandler(async (req, res) => {
  const { imageName, imageType, fileType } = req.body;

  if (!imageType || (imageType !== "avatar" && imageType !== "coverImage")) {
    throw new ApiError(400, "Invalid image type. Must be 'avatar' or 'coverImage'.");
  }

  if (!fileType || !fileType.startsWith("image/")) {
    throw new ApiError(400, "Invalid file type. Must be an image.");
  }

  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(404, "User not found");
  }

  const imageKey = `users/${userId}/${imageType.toLowerCase()}.jpg`;

  // generate signed url for direct upload to s3
  const imageCommand = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: imageKey,
    ContentType: fileType,
  })

  const imageSignedUrl = await getSignedUrl(
    s3,
    imageCommand,
    {
      expiresIn: 60 * 5
    }
  )

  const user = await User.findById(userId);

  if (imageType === "avatar") {
    user.pendingAvatar = imageKey;
  }

  else if (imageType === "coverImage") {
    user.pendingCoverImage = imageKey;
  }

  await user.save();

  res.status(200).json(new ApiResponse(200, { imageSignedUrl, imageType }, "Signed URL generated successfully"));

})

const verifyProfileImageUpload = asyncHandler(async (req, res) => {

  const { imageType } = req.body;

  if (!req.user || !req.user._id || !isValidObjectId(req.user._id)) {
    throw new ApiError(404, "User ID is required and must be valid ObjectId");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!imageType || (imageType !== "avatar" && imageType !== "coverImage")) {
    throw new ApiError(400, "Invalid image type. Must be 'avatar' or 'coverImage'.");
  }

  try {
    const imageS3Res = await s3.send(new HeadObjectCommand({
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: imageType === "avatar" ? user.pendingAvatar : user.pendingCoverImage
    }))

    if (!imageS3Res || imageS3Res.ContentLength <= 0) {
      throw new ApiError(400, "Image not found in S3. Please upload the image before verification.");
    }

  } catch (error) {
    throw new ApiError(500, "Error occurred while verifying profile image upload.");
  }

  if (imageType === "avatar") {
    user.avatar = user.pendingAvatar;
    user.pendingAvatar = null;
  }
  else if (imageType === "coverImage") {
    user.coverImage = user.pendingCoverImage;
    user.pendingCoverImage = null;
  }

  await user.save();

  res.status(200).json(new ApiResponse(200, {}, "Profile image verified and updated successfully"));

})

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const channel = await User.aggregate(
    [
      {
        $match: {
          userName: username?.toLowerCase()
        }
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers"
        }
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo"
        }
      },
      {
        $addFields: {
          subscribersCount: {
            $size: "$subscribers"
          },
          channelSubscribedTo: {
            $size: "$subscribedTo"
          },
          isSubscribed: {
            $cond: {
              if: { $in: [req.user?._id, "$subscribers.subscriber"] },
              then: true,
              else: false
            }
          }
        }
      },
      {
        $project: {
          fullName: 1,
          userName: 1,
          avatar: 1,
          coverImage: 1,
          subscribersCount: 1,
          channelSubscribedTo: 1,
          isSubscribed: 1,
          email: 1
        }
      }
    ]
  )
  if (!channel || channel.length === 0) {
    throw new ApiError(404, "Channel not found");
  }
  const s3DataKeys = ["avatar", "coverImage"];
  channel[0] = attachS3Urls(channel[0], s3DataKeys);

  return res.status(200).json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"));
})

const getWatchHistory = asyncHandler(async (req, res) => {

  if (!req.user || !req.user._id || !isValidObjectId(req.user._id)) {
    throw new ApiError(404, "User not found");
  }

  const user = await User.aggregate(
    [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user._id)
        }
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullName: 1,
                      userName: 1,
                      avatar: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                owner: {
                  $first: "$owner"
                }
              }
            }
          ]
        }
      },

    ]
  )
  if (!user || user.length === 0) {
    throw new ApiError(404, "User not found");
  }
  const s3DataKeys = [
    "videoFile",
    "thumbnail",
    "owner.avatar",
    "hls.masterUrl",
    "hls.resolutions.360p.playlistUrl",
    "hls.resolutions.720p.playlistUrl",
    "hls.resolutions.1080p.playlistUrl",
  ];

  const transformedData = attachS3Urls(user[0]?.watchHistory
    , s3DataKeys);


  return res.status(200).json(new ApiResponse(200, transformedData, "Watch history fetched successfully"))

})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  profileImageSignedUrl,
  verifyProfileImageUpload,
  getUserChannelProfile,
  getWatchHistory,
};