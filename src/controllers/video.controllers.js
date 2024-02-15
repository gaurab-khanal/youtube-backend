import { Video } from "../models/video.modal.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/likes.model.js";
import { Playlist } from "../models/playlist.model.js";

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

  const video = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

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

  return res
    .status(200)
    .json(new ApiResponse(200, newVideo, "Video published successfully"));
});

const myVideos = asyncHandler(async (req, res) => {
  const video = await Video.find({ owner: req.user._id });

  if (!video) {
    throw new ApiError(400, "No videos found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "User video fetched"));
});

export { publishVideo, myVideos };
