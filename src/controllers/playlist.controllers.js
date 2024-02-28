import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.modal.js";

const createPlayList = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    throw new ApiError(400, "Name is reqiured");
  }

  const Playlistdescription = description || " ";

  const playlist = await Playlist.create({
    name,
    description: Playlistdescription,
    owner: req.user?._id,
    videos: [],
  });

  if (!playlist) {
    throw new ApiError(500, "Something went wrong while creating playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

const getUserPlayList = asyncHandler(async (req, res) => {
  const playlist = await Playlist.aggregate([
    {
      $match: {
        owner: req.user?._id,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        owner: 1,
        createdAt: 1,
        updatedAt: 1,
        videos: 1,
      },
    },
  ]);

  if (!playlist) {
    throw new ApiError(404, "Playlist Not Found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist Fetched Successfully"));
});

const getPlayListById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!playlistId) {
    throw new ApiError(400, "Playlist id is required");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        owner: 1,
        createdAt: 1,
        updatedAt: 1,
        videos: 1,
      },
    },
  ]);

  if (!playlist) {
    throw new ApiError(404, "Playlist Not Found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist Fetched Successfully"));
});

const isPlaylistOwner = async (playlistId, userId) => {
  try {
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      throw new ApiError(400, "playlist doesn't exist");
    }

    if (playlist?.owner.toString() !== userId.toString()) {
      return false;
    }

    return true;
  } catch (error) {
    throw new ApiError(400, error.message || "Playlist Not Found");
  }
};

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!playlistId || !videoId) {
    throw new ApiError(400, "PlaylistId and videoId both required!!");
  }

  if (!isPlaylistOwner(playlistId, req.user?._id)) {
    throw new ApiError(401, "Unauthorized access");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const playlist = await Playlist.findById(playlistId);
  if (playlist.videos.includes(videoId)) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video Is  already present In Playlist"));
  }

  playlist.videos.push(videoId);

  const updatedOne = await playlist.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedOne, "Video added to playlist successfully")
    );
});

export { createPlayList, getUserPlayList, getPlayListById, addVideoToPlaylist };
