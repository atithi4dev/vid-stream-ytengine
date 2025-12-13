import { Router } from "express";
import {
  addComment,
  addTweetComment,
  deleteComment,
  getTweetComments,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJwt } from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(verifyJwt);

router.route("/:videoId")
.get(getVideoComments)
.post(addComment);

router.route("/t/:tweetId")
.get(getTweetComments)
.post(addTweetComment);

router.route("/c/:commentId")
.delete(deleteComment)
.patch(updateComment);



export default router;
