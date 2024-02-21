import { Video } from "../models/video.modal.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinray, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/likes.model.js";
import { Playlist } from "../models/playlist.model.js";
import { isValidObjectId } from "mongoose";

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

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
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

  return res
    .status(200)
    .json(new ApiResponse(200, deleteVideo, "Video deleted successfully"));
});

export {
  publishVideo,
  myVideos,
  myVideosToPublic,
  getVideoById,
  updateVideo,
  deleteVideo,
};
