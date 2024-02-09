import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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
    throw new ApiError(400, "Avatar file is required");
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

  return res.send(email);
});

export { registerUser };
