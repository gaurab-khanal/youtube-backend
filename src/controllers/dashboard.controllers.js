import mongoose from "mongoose";
import { Like } from "../models/likes.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Video } from "../models/video.modal.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const getChannelStat = asyncHandler(async (req, res) => {
  // get channel stat info-> total like, total video views, total subscribers, total videos

  const userId = req.user?._id;

  try {
    const stat = await Video.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "Likes",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "owner",
          foreignField: "channel",
          as: "Subscribers",
        },
      },
      {
        $group: {
          _id: null,
          TotalVideos: { $sum: 1 },
          TotalViews: { $sum: "$views" },
          TotalSubscribers: { $first: { $size: "$Subscribers" } },
          TotalLikes: { $first: { $size: "$Likes" } },
        },
      },
      {
        $project: {
          _id: 0,
          TotalSubscribers: 1,
          TotalLikes: 1,
          TotalVideos: 1,
          TotalViews: 1,
        },
      },
    ]);

    if (!stat) {
      throw new ApiError(500, "Unable to fetch the channel stat!");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, stat[0], "Channel Stat fetched Successfully"));
  } catch (error) {
    throw new ApiError(
      500,
      error?.message || "Unable to fetch the channelm stat!!"
    );
  }
});

export { getChannelStat };
