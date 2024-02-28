import {
  myLikesVideo,
  noOfLikesInComment,
  noOfLikesInTweet,
  noOfLikesInVideo,
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
} from "../controllers/like.controllers.js";

import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJwt);

router.route("/toggle/v/:videoId").post(toggleVideoLike).get(noOfLikesInVideo);
router.route("/toggle/t/:tweetId").post(toggleTweetLike).get(noOfLikesInTweet);
router
  .route("/toggle/c/:commentId")
  .post(toggleCommentLike)
  .get(noOfLikesInComment);
router.route("/video").get(verifyJwt, myLikesVideo);

export default router;
