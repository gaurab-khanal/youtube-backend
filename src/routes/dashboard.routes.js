import { Router } from "express";
import { getChannelStat } from "../controllers/dashboard.controllers.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJwt);

router.route("/").get(getChannelStat);

export default router;
