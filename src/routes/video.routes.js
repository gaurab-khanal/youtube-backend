import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  myVideos,
  publishVideo,
  myVideosToPublic,
  getVideoById,
  updateVideo,
  deleteVideo,
  tooglePublishStatus,
  getAllVideos,
} from "../controllers/video.controllers.js";

const router = Router();

router.route("/").post(
  verifyJwt,
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),

  publishVideo
);

router
  .route("/update/:videoId")
  .patch(verifyJwt, upload.single("thumbnail"), updateVideo);

router.route("/myvideos").get(verifyJwt, myVideos);
router.route("/channelVideo/:id").get(myVideosToPublic);
router.route("/allVideos").get(getAllVideos);
router.route("/:videoId").get(getVideoById).delete(verifyJwt, deleteVideo);

router.route("/toggle/publish/:videoId").patch(verifyJwt, tooglePublishStatus);

export default router;
