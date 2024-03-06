import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken"; // used for access and refresh token // JWT is a bearer token which is it sends the data to one who have access to the token
import bcrypt from "bcrypt"; // decrypt and encrypt passwords
import validator from "validator";
import crypto from "crypto";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Please provide username"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Please enter email in correct format"],
    },
    fullName: {
      type: String,
      required: [true, "Please provide your fullname"],
      trim: true,
      index: true,
    },
    avatar: {
      id: {
        type: String, // cloudinary id
        required: true,
      },
      url: {
        type: String, // cloudinary url service
        required: true,
      },
    },
    coverImage: {
      id: {
        type: String, // cloudinary id
      },
      url: {
        type: String, // cloudinary url service
      },
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    forgetPasswordToken: {
      type: String,
    },
    forgetPasswordTokenExpiry: {
      type: Date,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.getForgetPasswordToken = function () {
  // generate a long and random string
  const forgetToken = crypto.randomBytes(20).toString("hex");

  //hash the token for security
  this.forgetPasswordToken = crypto
    .createHash("sha256")
    .update(forgetToken)
    .digest("hex");

  this.forgetPasswordTokenExpiry =
    Date.now() + process.env.FORGET_PASSWORD_EXPIRY_TIME * 60 * 1000;

  return forgetToken;
};

export const User = mongoose.model("User", userSchema);
