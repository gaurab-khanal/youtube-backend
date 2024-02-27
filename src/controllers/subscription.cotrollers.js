import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user?._id;

  if (!channelId) {
    throw new ApiError(404, "Channel id is required");
  }

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Channel id isn't valid");
  }

  if (!userId) {
    throw new ApiError(404, "User id is required");
  }

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Channel id isn't valid");
  }

  const findChannel = await User.findById(channelId);
  const findUser = await User.findById(userId);

  if (!findChannel) {
    throw new ApiError(400, "Channel doesnot exist");
  }

  if (!findUser) {
    throw new ApiError(400, "User doesnot exist");
  }

  const isSubscribedCriteria = {
    subscriber: userId,
    channel: channelId,
  };

  const isSubscribed = await Subscription.findOne(isSubscribedCriteria);

  if (!isSubscribed) {
    const subscribe = await Subscription.create({
      subscriber: userId,
      channel: channelId,
    });

    if (!subscribe) {
      throw new ApiError(400, "Error while subscribing channel");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, subscribe, "Channel is sunscribed successfully")
      );
  }

  const subscribeRemove = await Subscription.deleteOne({
    subscriber: userId,
    channel: channelId,
  });

  if (!subscribeRemove) {
    throw new ApiError(400, "Error while unsubscribing channel");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribeRemove,
        "Channel is unsunscribed successfully"
      )
    );
});

const getOtherChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) {
    throw new ApiError(400, "Channel id is missing");
  }

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Channel id is invalid");
  }

  const subscribers = await Subscription.find({ channel: channelId });

  if (!subscribers) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "Error while fetching subscriber"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers,
        "All subscribers are fetched successfully"
      )
    );
});

const getMySubscriptionList = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(400, "User id is missing");
  }

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "User id is invalid");
  }

  let mySubscribtionList = await Subscription.find({
    subscriber: userId,
  }).populate({
    path: "channel",
    select: "fullName email avatar ",
  });

  if (!mySubscribtionList) {
    throw new ApiError(400, "Error fetching user subscribed list");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        mySubscribtionList,
        "User subscribed list fetched successfully"
      )
    );
});

export {
  toggleSubscription,
  getOtherChannelSubscribers,
  getMySubscriptionList,
};
