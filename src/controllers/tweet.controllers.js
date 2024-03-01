import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "./../models/tweet.model.js";

const createTweet = asyncHandler(async (req, res) => {
  const owner = req.user?._id;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Tweet content is missing");
  }

  const tweet = await Tweet.create({
    content,
    owner,
  });

  if (!tweet) {
    throw new ApiError(500, "Unable to create tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

const getUserTweet = asyncHandler(async (req, res) => {
  const owner = req.user?._id;

  if (!owner) {
    throw new ApiError(404, "User id is missing");
  }

  if (!isValidObjectId(owner)) {
    throw new ApiError(400, "User id is invalid");
  }

  const tweet = await Tweet.find({ owner });

  if (!tweet || tweet.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "User have no tweets"));
  }

  console.log();

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "USer tweet fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { tweetContent } = req.body;

  if (!tweetId) {
    throw new ApiError(404, "Tweet id is missing");
  }
  if (!tweetContent) {
    throw new ApiError(404, "Tweet content is required");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(401, "Unauthorized access");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content: tweetContent,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedTweet) {
    throw new ApiError(500, "Unable to update tweet at this moment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user?._id;

  if (!tweetId) {
    throw new ApiError(404, "Tweet id is missing");
  }
  if (!userId) {
    throw new ApiError(404, "User id is required");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== userId.toString()) {
    throw new ApiError(401, "Unauthorized access");
  }

  const deleteTweet = await Tweet.findByIdAndDelete(tweetId);

  if (!deleteTweet) {
    throw new ApiError(500, "Unable to delete tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deleteTweet, "Tweet deleted Successfully"));
});

export { createTweet, getUserTweet, updateTweet, deleteTweet };
