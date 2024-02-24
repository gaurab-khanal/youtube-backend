import { Router } from "express";
import {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment,
} from "../controllers/comment.controllers.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/:videoId").get(getVideoComments).post(verifyJwt, addComment);
router.route("/update/:commentId").patch(verifyJwt, updateComment);
router.route("/delete/:commentId").delete(verifyJwt, deleteComment);

export default router;
