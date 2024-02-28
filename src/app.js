import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

//  can do this as well for allowing multiple origins
// const allowedOrigins = [process.env.CORS_ORIGIN1, process.env.CORS_ORIGIN2]; // Add more origins as needed

app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // only the url of cors origin is allowed and pass allowedOrigins
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" })); // cann remove limit. set this only when limiting json.
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // allows to receive data from url by encoding special characters.
app.use(express.static("public")); // allows to store static data received from frontend into public.

app.use(cookieParser()); // allows to access cookies of browser as well set the cookies.

// routes import

import userRoutes from "./routes/user.routes.js";
import videoRoutes from "./routes/video.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import LikeRoutes from "./routes/like.routes.js";
import SubscriberRoutes from "./routes/subscription.routes.js";
import Dashboard from "./routes/dashboard.routes.js";

// routes declaration
app.use("/api/v1/subscription", SubscriberRoutes);
app.use("/api/v1/stat", Dashboard);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/comment", commentRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/video", videoRoutes);
app.use("/api/v1/like", LikeRoutes);

export { app };
