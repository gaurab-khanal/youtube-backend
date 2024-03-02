import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const getUserId = async (req, _) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded?._id).select("-refreshToken");

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    console.log("jgdg", user);

    return user?._id;
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
};
