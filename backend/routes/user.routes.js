import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  getUserProfile,
  followUnfollowUser,
} from "../controllers/user.controller.js";

const router = express.Router();

//get profile of a user by username
router.get("/profile/:username", protectRoute, getUserProfile);

// //get suggested users
// router.get("/suggested", protectRoute, getUserProfile);

router.post("/follow/:id", protectRoute, followUnfollowUser);

// //update profile
// router.post("/update", protectRoute, updateUserProfile);
export default router;
