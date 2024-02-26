import {
  toggleCommentLike,
  toggleVideoLike,
} from "../controllers/like.controllers";

import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware";

router.use(verifyJwt);

const router = Router();

router.route("/toggle/v/:videoId").post(toggleVideoLike);
router.route("/toggle/c/:commentId").post(toggleCommentLike);

export default router;
