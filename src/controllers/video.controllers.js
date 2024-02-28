import { Video } from "../models/video.modal.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinray, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/likes.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Types, isValidObjectId } from "mongoose";

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  console.log(title, description);

  if (!title || !description) {
    throw new ApiError(400, "Title and description both are required");
  }

  const videoLocalPath = await req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = await req.files?.thumbnail[0]?.path;

  if (!videoLocalPath) {
    throw new ApiError(404, "Video is required!!!");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(404, "Thumbnail is required!!!");
  }

  // upload on cloudinary

  const [video, thumbnail] = await Promise.all([
    uploadOnCloudinary(videoLocalPath),
    uploadOnCloudinary(thumbnailLocalPath),
  ]);

  console.log("Video: ", video);

  if (!video?.url) {
    throw new ApiError(
      500,
      "Something wrong happens while uplaoding the video"
    );
  }
  if (!thumbnail?.url) {
    throw new ApiError(
      500,
      "Something wrong happens while uplaoding the thumbnail"
    );
  }

  const newVideo = await Video.create({
    videoFile: {
      id: video.public_id,
      url: video.url,
    },
    thumbnail: {
      id: thumbnail.public_id,
      url: thumbnail.url,
    },
    title,
    description,
    isPublished: true,
    owner: req.user?._id,
    duration: video.duration,
  });

  if (!newVideo) {
    throw new ApiError(
      500,
      "something went wrong while store the video in database"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newVideo, "Video published successfully"));
});

const myVideos = asyncHandler(async (req, res) => {
  const video = await Video.find({ owner: req.user._id }).populate(
    "owner",
    "avatar fullName username"
  );

  if (!video) {
    throw new ApiError(400, "No videos found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "User video fetched"));
});

const myVideosToPublic = asyncHandler(async (req, res) => {
  // get videos by specific user id
  const video = await Video.find({ owner: req.params.id }).populate(
    "owner",
    "avatar fullName username"
  );

  if (!video) {
    throw new ApiError(400, "No videos found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "User video fetched"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const updatedVideoViews = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        views: video.views + 1,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideoViews, "Video fetched successfully")
    );
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const user = req.user._id;
  const { title, description } = req.body;
  const thumbnailFile = req.file?.path;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Video id isn't valid");
  }

  if (!(title || description)) {
    throw new ApiError(400, "All fields are required");
  }

  const videoDetails = await Video.findById(videoId);

  if (String(videoDetails.owner) !== String(user)) {
    throw new ApiError(400, "Only owner can update video");
  }

  if (!videoDetails) {
    throw new ApiError(404, "Video not found");
  }

  // set new fields as an object to update later on as we need to add thumbnail details if available to upate this one later on
  let updatedFields = {
    $set: {
      title,
      description,
    },
  };

  // upload new thumbnail to cloudinary if available
  if (thumbnailFile) {
    const thumbnailUploadDetails = await uploadOnCloudinary(thumbnailFile);
    if (!thumbnailUploadDetails) {
      throw new ApiError(
        500,
        "Something went wrong while upating thumbnail on cloudinary!!"
      );
    }

    await deleteOnCloudinray(videoDetails.thumbnail?.id);

    updatedFields.$set.thumbnail = {
      id: thumbnailUploadDetails.public_id,
      url: thumbnailUploadDetails.url,
    };
  }

  // update video file

  const updatedVideo = await Video.findByIdAndUpdate(videoId, updatedFields, {
    new: true,
  });

  if (!updateVideo) {
    throw new ApiError(
      500,
      "Something went wrong while updating video details"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { updatedVideo }, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const user = req.user._id;

  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Video id isn't valid");
  }

  const video = await Video.findById(videoId);

  console.log(video);

  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  if (String(user) !== String(video.owner)) {
    throw new ApiError(400, "You are not the owner of this video");
  }

  // delete process begins
  // delete files on cloudinary

  if (video.videoFile) {
    await deleteOnCloudinray(video.videoFile?.id);
  }

  if (video.thumbnail) {
    await deleteOnCloudinray(video.thumbnail?.id);
  }

  const deleteVideo = await Video.findByIdAndDelete(videoId);

  // delete comment and like modal for deleted video based on id;
  await Comment.deleteMany({ video: videoId });
  await Like.deleteMany({ video: videoId });

  return res
    .status(200)
    .json(new ApiResponse(200, deleteVideo, "Video deleted successfully"));
});

const isUserOwner = async (videoId, req) => {
  const video = await Video.findById(videoId);

  if (video?.owner.toString() === req.user?._id.toString()) {
    return true;
  } else {
    return false;
  }
};

const tooglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(404, "Video id is required");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const isAuthorized = await isUserOwner(videoId, req);

  if (!isAuthorized) {
    throw new ApiError(300, "Unauthorized Access");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    { new: true }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Something went wrong while toggling the status");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideo,
        "Published status of video updated successfully"
      )
    );
});

const getAllVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit = 12, query, sortBy, userId } = req.query;

  // Parse page and limit to number;

  page = parseInt(page, 10);
  limit = parseInt(limit, 10);

  // validate and adjust page and limit values;
  page = Math.max(1, page);
  limit = Math.min(20, Math.max(1, limit)); // make sure the limit is between 1 and 20.

  const pipeline = [];

  // return videos by owner if userId is provided
  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "UserId is invalid");
    }

    pipeline.push({
      $match: {
        owner: new Types.ObjectId(userId),
      },
    });
  }

  // match videos based on search query;
  if (query) {
    pipeline.push({
      $match: {
        $text: {
          $search: query,
        },
      },
    });
  }

  // sort based on sortBy and sortType

  const sortCriteria = {};

  if (sortBy) {
    sortCriteria[sortBy] = sortBy === "asc" ? 1 : -1;
    pipeline.push({
      $sort: sortCriteria,
    });
  } else {
    // defaut sort by createdAt field
    sortCriteria["createdAt"] = -1;
    pipeline.push({
      $sort: sortCriteria,
    });
  }

  let skip = (page - 1) * limit;
  // pagination
  pipeline.push({
    $skip: skip,
  });

  pipeline.push({
    $limit: limit,
  });

  // add aggeration pipeline
  const Videos = await Video.aggregate(pipeline);

  if (!Videos || Videos.length === 0) {
    throw new ApiError(404, "Videos not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, Videos, "Videos fetched successfully"));
});

export {
  publishVideo,
  myVideos,
  myVideosToPublic,
  getVideoById,
  updateVideo,
  deleteVideo,
  tooglePublishStatus,
  getAllVideos,
};
