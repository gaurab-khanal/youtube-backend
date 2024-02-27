import { Router } from "express";
import {
  toggleSubscription,
  getMySubscriptionList,
  getOtherChannelSubscribers,
} from "../controllers/subscription.cotrollers.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/:channelId").post(verifyJwt, toggleSubscription);
router.route("/").get(verifyJwt, getMySubscriptionList);
router.route("/:channelId").get(getOtherChannelSubscribers);

export default router;
