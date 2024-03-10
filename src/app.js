import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";

const app = express();

//  can do this as well for allowing multiple origins
// const allowedOrigins = [process.env.CORS_ORIGIN1, process.env.CORS_ORIGIN2]; // Add more origins as needed

const allowedOrigins = process.env.CORS_ORIGIN.split(","); // split the string by comma and store in array

app.use(
  cors({
    origin: allowedOrigins, // only the url of cors origin is allowed and pass allowedOrigins
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" })); // cann remove limit. set this only when limiting json.
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // allows to receive data from url by encoding special characters.
app.use(express.static("public")); // allows to store static data received from frontend into public.

app.use(cookieParser()); // allows to access cookies of browser as well set the cookies.

app.use(morgan("tiny"));

// routes import

import userRoutes from "./routes/user.routes.js";
import videoRoutes from "./routes/video.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import LikeRoutes from "./routes/like.routes.js";
import SubscriberRoutes from "./routes/subscription.routes.js";
import Dashboard from "./routes/dashboard.routes.js";
import Playlist from "./routes/playlist.routes.js";
import Tweet from "./routes/tweet.routes.js";

// docs setup
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { ApiError } from "./utils/ApiError.js";

const swaggerDocument = YAML.load("./swagger.yaml");
app.use("/apiDocs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// routes declaration
app.use("/api/v1/subscription", SubscriberRoutes);
app.use("/api/v1/tweet", Tweet);
app.use("/api/v1/playlist", Playlist);
app.use("/api/v1/stat", Dashboard);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/comment", commentRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/video", videoRoutes);
app.use("/api/v1/like", LikeRoutes);

// send error in json form
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: err.success,
      message: err.message,
      errors: err.errors,
      data: err.data,
    });
  } else {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      errors: [err.message],
      data: null,
    });
  }
});

export { app };
