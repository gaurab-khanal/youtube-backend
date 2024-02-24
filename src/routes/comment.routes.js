import { Router } from "express";
import {
  getVideoComments,
  addComment,
} from "../controllers/comment.controllers.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/:videoId").get(getVideoComments).post(verifyJwt, addComment);

export default router;
