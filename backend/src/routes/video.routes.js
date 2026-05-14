import { Router } from "express";
import {
  getAllPublishedVideos,
  getAllPrivateVideos,
  deleteVideo,
  getVideoById,
  videoSignedUrl,
  verifyVideoUpload,
  togglePublishStatus,
  updateVideo,
  getAllOwnVideos,
  progressiveStream,
  adaptiveStream,
} from "../controllers/video.controller.js";
import { verifyJwt } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();

router.route("/published").get(getAllPublishedVideos);

router
.route("/")
.get(verifyJwt, getAllOwnVideos)

router.route("/private").get(verifyJwt,getAllPrivateVideos);

router.post("/upload-urls", verifyJwt, videoSignedUrl);
router.patch("/upload-complete/:videoId", verifyJwt, verifyVideoUpload);

router
.route("/:videoId")
.get(verifyJwt, getVideoById)
.delete(verifyJwt, deleteVideo)
.patch(verifyJwt, updateVideo);

router.route("/stream/:videoId/progressive").get(progressiveStream);
router.route("/stream/:videoId/adaptive").get(adaptiveStream);

router.route("/toggle/publish/:videoId").patch(verifyJwt, togglePublishStatus);

export default router;