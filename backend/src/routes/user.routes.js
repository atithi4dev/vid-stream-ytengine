import { Router } from "express";
import {
  logoutUser,
  registerUser,
  loginUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  updateAccountDetails,
  profileImageSignedUrl,
  verifyProfileImageUpload,
  getWatchHistory
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJwt } from "../middlewares/auth.middlewares.js";

const router = Router();

// Unsecured User
router.route("/register").post(
  registerUser
);

router.route("/login").post(loginUser);

router.route("/refresh-token").post(refreshAccessToken);

// secure routes :

router.route("/logout").post(verifyJwt, logoutUser);
router.route("/change-password").post(verifyJwt, changeCurrentPassword)
router.route("/current-user").get(verifyJwt, getCurrentUser)
router.route("/upload-profile-image").post(verifyJwt, profileImageSignedUrl);

router.route("/confirm/upload-profile-image").patch(verifyJwt, verifyProfileImageUpload)

router.route("/c/:username").get(verifyJwt, getUserChannelProfile)
router.route("/update-account").patch(verifyJwt, updateAccountDetails)

router.route('/history').get(verifyJwt, getWatchHistory)

export default router;
