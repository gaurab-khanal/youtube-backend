import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.modal.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const CommentsAggerate = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        likesCount: 1,
        owner: {
          username: 1,
          fullName: 1,
          "avatar.url": 1,
        },
        isLiked: 1,
      },
    },
  ]);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const comments = await Comment.aggregatePaginate(CommentsAggerate, options);

  if (!comments || comments.totalDocs === 0) {
    return res.status(200).json(new ApiResponse(200, {}, "No comments found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comment fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;
  const owner = req.user._id;

  if (!videoId) {
    throw new ApiError(400, "Video id is required");
  }

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  if (!content) {
    throw new ApiError(404, "Comment field is empty");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const comment = await Comment.create({
    content,
    video: videoId,
    owner,
  });

  if (!comment) {
    throw new ApiError(400, "Erro while adding comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const user = req.user._id;
  const { content } = req.body;

  if (!commentId) {
    throw new ApiError(404, "Comment id is required");
  }

  const checkComment = await Comment.findById(commentId);

  if (!checkComment) {
    throw new ApiResponse(404, "Comment not found");
  }

  // check if video for the comment exist or not
  const videoId = new mongoose.Types.ObjectId(checkComment.video);

  const video = await Video.findById(videoId);

  if (!video) {
    // if video not found then comment should be deleted
    await Comment.deleteMany({ video: videoId });
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "Comment doesn't exists"));
  }

  if (checkComment.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(300, "Unauthorized Access");
  }

  if (!content) {
    throw new ApiError(404, "Comment is required");
  }

  const comment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );

  if (!comment) {
    throw new ApiError(
      400,
      "Unable to update comment this time due to some error"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  // check if invalid commentId
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId!");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found!");
  }

  if (userId.toString() !== comment.owner.toString()) {
    throw new ApiError(403, "Unauthorized access to delete comment");
  }

  const deleteComment = await Comment.findByIdAndDelete(commentId);

  if (!deleteComment) {
    throw new ApiError(404, "Something went wrong while deleting comment");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deleteComment, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
