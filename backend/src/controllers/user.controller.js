import {asyncHandler} from "../utils/api-utils/asyncHandler.js";
import { ApiError } from "../utils/api-utils/ApiError.js";
import User from "../models/user.models.js";
import mongoose from "mongoose";  
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  uploadFolderToCloudinary
} from "../utils/assets-utils/Cloudinary.js";
import { ApiResponse } from "../utils/api-utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import path from 'path';

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

  const { userName, email, fullName, password } = req.body;

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

  // Upload Avatar and Cover Image on Cloudinary

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  let avatar;
  if (avatarLocalPath) {
    try {
      avatar = await uploadOnCloudinary(avatarLocalPath);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      throw new ApiError(500, "Failed to upload avatar image");
    }
  }

  let coverImage;
  if (coverImageLocalPath) {
    try {
      coverImage = await uploadOnCloudinary(coverImageLocalPath);
    } catch (error) {
      console.error("Error uploading coverImage:", error);
      throw new ApiError(500, "Failed to upload coverImage image");
    }
  }

  // Create User
  try {
    const user = await User.create({
      fullName,
      userName: userName.toLowerCase(),
      email,
      password,
      avatar: avatar?.url || null,
      coverImage: coverImage?.url || null,
      imageDetails: [
        {
          name: "avatar",
          publicId: avatar?.public_id || null,
        },
        {
          name: "coverImage",
          publicId: coverImage?.public_id || null,
        },
      ],
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new ApiError(500, "User creation failed");
    }
    console.log("User Created Successfully:", createdUser);
    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User registered successfully"));
  } catch (error) {
    console.error("User Creation Failed:", error);
    if (avatar) {
      await deleteFromCloudinary(avatar.public_id);
    }
    if (coverImage) {
      await deleteFromCloudinary(coverImage.public_id);
    }
    throw new ApiError(
      500,
      "User creation failed also image being upload deleted"
    );
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, userName, password } = req.body;

  // validation
  if (!email || !userName || !password) {
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
    "-password -refreshToken"
  );

  if (!loggedInUser) {
    throw new ApiError(500, "User login failed");
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, {
        user: loggedInUser,
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
    secure: process.env.NODE_ENV === "production",
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
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(404, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    console.error("Error refreshing access token:", error);
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

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
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
  res.status(200).json(new ApiResponse(200, req.user, "Current user details."));
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

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Account details updated successfully")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const MAINPATH = path.join(process.cwd(), "public/HelloTest")
  // console.log(MAINPATH)

  uploadFolderToCloudinary(MAINPATH,"WHOKNOWS")
  
  const public_id = user.imageDetails.find(
    (img) => img.name === "avatar"
  )?.publicId;
  
  
  // Upload new avatar image to Cloudinary
  
  const avatarLocalPath = req.file?.path;
  
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }
  
  let avatar = await uploadOnCloudinary(avatarLocalPath);
  
  if (!avatar.url) {
    throw new ApiError(500, "Failed to upload avatar image");
  }

  // Delete old avatar from cloudinary if exists
  
  if (public_id) {
    await deleteFromCloudinary(public_id);
  }

  user.avatar = avatar.url;
  user.imageDetails = user.imageDetails.map((img) =>
    img.name === "avatar" ? { name: "avatar", publicId: avatar.public_id } : img
  );
  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const oldCoverImage = user.coverImage;

  const public_id = user.imageDetails.find(
    (img) => img.name === "coverImage"
  )?.publicId;

  if (oldCoverImage !== null) {
    // Delete from cloudinary if exists
    if (public_id) {
      await deleteFromCloudinary(public_id);
    }
  }

  // Upload new cover image to Cloudinary
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image is required");
  }
  let coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(500, "Failed to upload cover image");
  }

  const newCoverImageUrl = coverImage.url;
  const imageDetails = {
    name: "coverImage",
    publicId: coverImage.public_id,
  };
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: newCoverImageUrl,
        imageDetails: user.imageDetails.map((img) =>
          img.name === "coverImage" ? imageDetails : img
        ),
      },
    },
    { new: true }
  );
  res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Cover image updated successfully")
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params;

    if(!username?.trim()) {
        throw new ApiError(400, "Username is required");
    }

    const channel = await User.aggregate(
      [
        {
          $match:{
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
            channelSubscribedTo:{
              $size: "$subscribedTo"
            },
            isSubscribed: {
              $cond: {
                if: {$in: [req.user?._id, "$subscribers.subscriber"]},
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
    if(!channel || channel.length === 0) {
        throw new ApiError(404, "Channel not found");
    }

    return res.status(200).json(new ApiResponse(200, channel[0], "Channel profile fetched successfully"));
})

const getWatchHistory = asyncHandler(async (req, res) => {


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

  return res.status(200).json(new ApiResponse(200, user[0]?.watchHistory, "Watch history fetched successfully"))

})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};