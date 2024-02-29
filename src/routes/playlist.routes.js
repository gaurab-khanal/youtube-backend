import { Router } from "express";
import {
  addVideoToPlaylist,
  createPlayList,
  deletePlaylist,
  getPlayListById,
  getUserPlayList,
  removeVideoFromPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controllers.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/create").post(verifyJwt, createPlayList);
router.route("/myplaylist").get(verifyJwt, getUserPlayList);
router.route("/fetch/:playlistId").get(getPlayListById);
router
  .route("/video/:playlistId/:videoId")
  .patch(verifyJwt, addVideoToPlaylist)
  .delete(verifyJwt, removeVideoFromPlaylist);

router.route("/update/:playlistId").patch(verifyJwt, updatePlaylist);
router.route("/delete/:playlistId").delete(verifyJwt, deletePlaylist);

export default router;
