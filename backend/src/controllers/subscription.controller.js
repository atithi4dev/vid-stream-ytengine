import mongoose, { isValidObjectId } from "mongoose";
import User from "../models/user.models.js";
import Subscription from "../models/subscription.models.js";
import { ApiError } from "../utils/api-utils/ApiError.js";
import { ApiResponse } from "../utils/api-utils/ApiResponse.js";
import { asyncHandler } from "../utils/api-utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriber = req.user._id;
  if (!channelId) {
    throw new ApiError(400, "Channel ID is required");
  }
  if (!isValidObjectId(subscriber) || !isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid subscriber or Channel ID");
  }
  if (subscriber.toString() === channelId.toString()) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }
  const subscription = await Subscription.findOne({
    subscriber: subscriber,
    channel: channelId,
  });
  if (subscription) {
    const unSubscribed = await Subscription.deleteOne({
      _id: subscription._id,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, unSubscribed, "Unsubscribed successfully"));
  } else {
    const newSubscription = await Subscription.create({
      subscriber: subscriber,
      channel: channelId,
    });
    if (!newSubscription) {
      throw new ApiError(500, "Failed to subscribe to the channel");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, newSubscription, "Subscribed successfully"));
  }
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId) {
    throw new ApiError(400, "Channel ID is required");
  }
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel ID");
  }

  const subscribers = await Subscription.find({ channel: channelId }).populate(
    "subscriber",
    "userName name email avatar"
  );
  if (!subscribers.length) {
    throw new ApiError(404, "Failed to fetch Subscribers");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, {subscribers, count: subscribers.length}, "Fetched Subscribers list successfully")
    );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!subscriberId) {
    throw new ApiError(400, "Please provide a subscriberId");
  }
  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Please provide a valid Subscriber Object Id");
  }
  const subscriptions =await Subscription.find({
    subscriber: subscriberId,
  }).populate("channel", "userName name email avatar coverImage")

  if(!subscriptions){
    throw new ApiError(404, "No subscriptions found for this user");
  }

  return res.status(200).json(new ApiResponse(200, subscriptions, "Fetched subscribed channels successfully"));
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
