import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinray, uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { sendMail } from "../utils/sendEmail.js";
import fs from "fs";
import crypto from "crypto";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar -> upload them to cloudinary, avatar
  // create user object -> create entry in db.
  // remove password and refresh token field from response
  // check for user creation
  // return res

  const { email, username, fullName, password } = req.body;
  console.log(email, username);

  console.log("Body: ", req.body);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  const userExist = await User.findOne({
    $or: [{ email }, { username }],
  });

  console.log("User: ", userExist);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  console.log(avatarLocalPath);

  if (userExist) {
    fs.unlink(avatarLocalPath, (err) => {
      if (err) {
        console.log("Error while deleting file: ", err);
      } else {
        console.log("File deleted successfully");
      }
    });
    throw new ApiError(409, "Email or username already exists");
  }

  let coverImageOnline = null;

  if (req.files?.coverImage) {
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    coverImageOnline = await uploadOnCloudinary(coverImageLocalPath);
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatarOnline = await uploadOnCloudinary(avatarLocalPath);

  console.log("Cloudinary: ", avatarOnline);

  if (!avatarOnline) {
    throw new ApiError(400, "Avatar filesss is required");
  }

  const user = await User.create({
    fullName,
    email,
    username: username.toLowerCase(),
    avatar: {
      id: avatarOnline.public_id,
      url: avatarOnline.url,
    },
    coverImage: coverImageOnline?.url || "",
    password,
  });

  const createdUser = await User.findById(user._id);

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created successfully"));
});

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId).select("+ refreshToken ");
    const refreshToken = user.generateRefreshToken();
    const accessToken = user.generateAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const loginUser = asyncHandler(async (req, res) => {
  // get user details - email, password
  // username or email
  // find user
  // password check
  // generate access and refresh token
  // send cookie
  const { email, username, password } = req.body;

  if (!(email || username) && !password) {
    throw new ApiError(400, "Email or username and password required");
  }

  const user = await User.findOne({
    $or: [{ email }, { username }],
  }).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found with given email or username");
  }

  const validatePassword = await user.isPasswordCorrect(password);

  if (!validatePassword) {
    throw new ApiError(400, "Password is invalid!");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({ loggedInUser });
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removed the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async () => {
  const incommingRefreshToken =
    req.cookies?.refreshToken ||
    req.body?.refreshToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!incommingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id).select(
      "+ refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incommingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used.");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id).select("+ password");
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old passsword");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    new ApiError(400, "Avatar file is missing");
  }

  const avatarOnline = await uploadOnCloudinary(avatarLocalPath);

  if (!avatarOnline) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findById(req.user._id);

  const avatarId = user.avatar?.id;

  const deleteFile = await deleteOnCloudinray(avatarId);

  console.log("Deleted avatar :", deleteFile);

  const userAvatar = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: {
          id: avatarOnline.public_id,
          url: avatarOnline.url,
        },
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, userAvatar, "Avatar updated successfully"));
});

const updateUserCover = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path;

  if (!coverLocalPath) {
    new ApiError(400, "Cover Image file is missing");
  }

  const coverOnline = await uploadOnCloudinary(coverLocalPath);

  if (!coverOnline) {
    throw new ApiError(400, "Error while uploading on cover image");
  }

  const user = await User.findById(req.user._id);

  const coverId = user.coverImage?.id;

  const deleteFile = await deleteOnCloudinray(coverId);

  const userCover = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: {
          id: coverOnline.public_id,
          url: coverOnline.url,
        },
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, userCover, "Cover Image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username unavailable");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedToWhichChannel",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedToWhichChannel",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        coverImage: 1,
        avatar: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(400, "Channel doesnot exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    avatar: 1,
                    username: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "User watchhistory fetched successfully"
      )
    );
});

const forgetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(400, "You aren't registered yet!");
  }

  const forgetToken = user.getForgetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // replae url with frontend url after frontend is ready;

  const myUrl = `http://localhost:8000/api/v1/resetpassword/${forgetToken}`;

  const message = `Copy paste this link in your browser and hit enter \n\n ${myUrl}`;

  try {
    const options = {
      email: user.email,
      subject: "Forget Password link",
      message: message,
    };

    await sendMail(options);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Foget password email sent successfully"));
  } catch (error) {
    console.log(error);
    user.forgetPasswordToken = undefined;
    user.forgetPasswordExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(400, error);
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { password, confirmPassword } = req.body;
  const { forgetToken } = req.params;

  if (!forgetToken) {
    throw new ApiError(404, "Forget password token is missing");
  }

  if (!password || !confirmPassword) {
    throw new ApiError(404, "Password or confirm password is missing");
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, "Password and confirm password doesnot match");
  }

  const encryptedToken = crypto
    .createHash("sha256")
    .update(forgetToken)
    .digest("hex");

  // make sure the received forgetToken is encryped and checked for its existence in db as in db
  // it is stored by encrypting it.
  // also dont forgetto check its expiry
  const user = await User.findOne({
    forgetPasswordToken: encryptedToken,
    forgetPasswordTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(401, "Token invalid or expired");
  }

  user.password = password;
  user.forgetPasswordToken = undefined;
  user.forgetPasswordTokenExpiry = undefined;

  const updatedUser = await user.save({ validateBeforeSave: false });

  updatedUser.password = undefined;

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedUser,
        "Password reset successfully, Proceed to login"
      )
    );
});

const deleteHistory = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!videoId) {
    throw new ApiError(404, "Video id is missing");
  }

  if (!userId) {
    throw new ApiError(404, "User id is missing");
  }

  // check for user

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.watchHistory.includes(videoId)) {
    throw new ApiError(404, "Video isnt available in user watchhistory");
  }

  const newWatchHistory = user.watchHistory.filter((item) => item != videoId);

  user.watchHistory = newWatchHistory;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted from watch history"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCover,
  getUserChannelProfile,
  getWatchHistory,
  forgetPassword,
  resetPassword,
  deleteHistory,
};
