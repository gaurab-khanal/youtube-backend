import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

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

  if (userExist) {
    throw new ApiError(409, "Email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  console.log(avatarLocalPath);

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
    avatar: avatarOnline.url,
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
      $set: {
        refreshToken: undefined,
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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
