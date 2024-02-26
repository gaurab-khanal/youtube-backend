import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.modal.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/likes.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video id is required!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const likedBy = { video: videoId, likedBy: req.user?._id };

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

  const dislike = await Like.deleteOne({ likedBy });

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

  const likedBy = { comment: commentId, likedBy: req.user?._id };

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

export { toggleCommentLike, toggleVideoLike };
