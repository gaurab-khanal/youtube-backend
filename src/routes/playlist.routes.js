import { Router } from "express";
import {
  addVideoToPlaylist,
  createPlayList,
  getPlayListById,
  getUserPlayList,
} from "../controllers/playlist.controllers.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/create").post(verifyJwt, createPlayList);
router.route("/myplaylist").get(verifyJwt, getUserPlayList);
router.route("/fetch/:playlistId").get(getPlayListById);
router
  .route("/addVideo/:playlistId/:videoId")
  .patch(verifyJwt, addVideoToPlaylist);

export default router;
