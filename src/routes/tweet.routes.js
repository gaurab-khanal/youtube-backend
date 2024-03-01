import { Router } from "express";
import {
  createTweet,
  deleteTweet,
  getUserTweet,
  updateTweet,
} from "../controllers/tweet.controllers.js";
import { verifyJwt } from "./../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/create").post(createTweet);
router.route("/delete/:tweetId").delete(deleteTweet);
router.route("/update/:tweetId").patch(updateTweet);
router.route("/").get(getUserTweet);

export default router;
