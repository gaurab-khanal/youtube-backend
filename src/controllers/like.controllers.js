import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.modal.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/likes.model.js";
import { Tweet } from "./../models/tweet.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video id is required!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const likedBy = { video: videoId, likedBy: req.user?._id.toString() };

  const isLiked = await Like.findOne(likedBy);

  if (!isLiked) {
    // toggle like to true;
    const newLike = await Like.create(likedBy);

    if (!newLike) {
      throw new ApiError(500, "Something went wrong, Unable to like video");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, newLike, "Video liked successfully"));
  }

  // if already liked then dislike the video
  console.log("Ljed: ", likedBy);

  const dislike = await Like.deleteOne(likedBy);

  if (!dislike) {
    throw new ApiError(500, "Unable to dislike the video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, dislike, "Video is disliked by user"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) {
    throw new ApiError(404, "Comment id is required");
  }

  const checkCommentExistence = await Comment.findById(commentId);

  if (!checkCommentExistence) {
    throw new ApiError(404, "Comment not found");
  }

  const likedBy = { comment: commentId, likedBy: req.user?._id.toString() };

  // check if user has already liked the comment

  const checkLike = await Like.findOne(likedBy);

  if (!checkLike) {
    // user hasn't liked the comment. Toggle comment like to true

    const like = await Like.create(likedBy);

    if (!like) {
      throw new ApiError(500, "Unable to like comment");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, like, "Comment liked successfully"));
  }

  // dislike the comment
  const dislike = await Like.deleteOne(likedBy);

  if (!dislike) {
    throw new ApiError(500, "Unable to dislike the comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Successfully dislike the comment"));
});

const noOfLikesInVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video id is missing");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Video id is invalid");
  }

  let videoLikes = await Like.find({
    video: videoId,
  });

  console.log("idoid: ", videoLikes);

  if (!videoLikes) {
    videoLikes = {};
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, [videoLikes], "Video likes fetched successfully")
    );
});

const noOfLikesInComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) {
    throw new ApiError(400, "Comment id is missing");
  }

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Comment id is invalid");
  }

  const commentLikes = await Like.find({
    comment: commentId,
  });

  if (!commentLikes) {
    throw new ApiError(400, "Error fetching likes in comment");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, [commentLikes], "Comment likes fetched successfully")
    );
});

const myLikesVideo = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(400, "User id is missing");
  }

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "User id is invalid");
  }

  console.log("user d: ", userId);

  const myLikes = await Like.find({
    likedBy: userId,
  }).populate("video");

  if (!myLikes) {
    throw new ApiError(400, "Error fetching my liked video");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, myLikes, "My liked videos fetched successfully")
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!tweetId) {
    throw new ApiError(400, "Tweet id is missing");
  }

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Tweet id is invalid");
  }

  const tweetExists = await Tweet.findById(tweetId);

  if (!tweetExists) {
    throw new ApiError(400, "Tweet not found");
  }

  const likeCriteria = { tweet: tweetId, likedBy: req.user?._id };

  const isLiked = await Like.findOne(likeCriteria);

  if (!isLiked) {
    const like = await Like.create(likeCriteria);

    if (!like) {
      throw new ApiError(
        500,
        "Unable to like tweet at this moment, try again later"
      );
    }

    return res
      .status(200)
      .json(new ApiResponse(200, like, "Successfully liked the tweet"));
  }

  const dislike = await Like.deleteOne(likeCriteria);

  if (!dislike) {
    throw new ApiError(
      500,
      "Unable to dislike tweet at this moment, try again later"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, dislike, "Successfully disliked the tweet"));
});

const noOfLikesInTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!tweetId) {
    throw new ApiError(400, "Tweet id is missing");
  }

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Tweet id is invalid");
  }

  const tweetLikes = await Like.find({
    tweet: tweetId,
  });

  if (!tweetLikes) {
    throw new ApiError(400, "Error fetching likes in tweet");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, [tweetLikes], "Comment likes fetched successfully")
    );
});

export {
  toggleCommentLike,
  toggleVideoLike,
  noOfLikesInVideo,
  myLikesVideo,
  noOfLikesInComment,
  toggleTweetLike,
  noOfLikesInTweet,
};
