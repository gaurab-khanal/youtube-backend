import { Router } from "express";
import {
  toggleSubscription,
  getMySubscriptionList,
  getOtherChannelSubscribers,
} from "../controllers/subscription.cotrollers";
import { verifyJwt } from "../middlewares/auth.middleware";

const router = Router();

router.route("/:channelId").post(verifyJwt, toggleSubscription);
router.route("/").get(verifyJwt, getMySubscriptionList);
router.route("/:channelId").get(getOtherChannelSubscribers);

export default router;
