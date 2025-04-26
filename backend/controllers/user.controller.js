import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

import { v2 as cloudinary } from "cloudinary";

export const getUserProfile = async (req, res) => {
  const { username } = req.params;

  try {
    //find the user for the client and dont include password
    const user = await User.findOne({ username }).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.log("Error in getUserProfile", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const followUnfollowUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userToModify = await User.findById(id);
    const currentUser = await User.findById(req.user._id);

    //prevent user from following himself
    if (id === req.user._id.toString()) {
      return res
        .status(400)
        .json({ error: "You can't follow/unfollow yourself" });
    }

    if (!userToModify || !currentUser) {
      return res.status(400).json({ error: "User not found" });
    }

    // to check if user is already following the id that we trynna follow/unfollow
    const isFollowing = currentUser.following.includes(id);

    if (isFollowing) {
      // Unfollow the user

      //update the followers of the user that we would like to unfollow
      await User.findByIdAndUpdate(id, {
        $pull: { followers: req.user._id },
      });

      //update the following of the user that wants to unfollow the userToModify
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { following: id },
      });

      //to update the UI immediately when following/unfollowing
      userToModify.followers = userToModify.followers.filter(
        (followerId) => followerId.toString() !== req.user._id.toString()
      );
      currentUser.following = currentUser.following.filter(
        (followingId) => followingId.toString() !== id.toString()
      );

      res.status(200).json({ message: "User unfollowed successfully" });
    }
    // Follow the user
    else {
      //update the followers of the user that we would like to follow
      await User.findByIdAndUpdate(id, {
        $push: { followers: req.user._id },
      });

      //update the following of the user that wants to follow the userToModify
      await User.findByIdAndUpdate(req.user._id, {
        $push: { following: id },
      });

      // Once we follow then send a notification to that user

      const newNotification = new Notification({
        from: req.user._id,
        to: userToModify._id,
        type: "follow",
      });

      await newNotification.save();

      res.status(200).json({ message: "User followed successfully" });
    }
  } catch (error) {
    console.log("Error in followUnfollowUser", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getSuggestedUsers = async (req, res) => {
  try {
    // First exclude the current user from the suggestion
    const userId = req.user._id;

    // Exclude the users that we already follow, by getting the following array
    const usersFollowedByMe = await User.findById(userId).select("following");

    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
        },
      },
      {
        //get 10 different users but not the authenticated user
        $sample: { size: 10 },
      },
    ]);

    // return users as long as their id isnt the same as the id of the followed ones
    const filteredUsers = users.filter(
      (user) => !usersFollowedByMe.following.includes(user._id)
    );

    //get 4 suggested users since some of them will be followed
    const suggestedUsers = filteredUsers.slice(0, 4);

    //for each suggested user the password should be null
    suggestedUsers.forEach((user) => (user.password = null));

    res.status(200).json(suggestedUsers);
  } catch (error) {
    console.log("Error in getSuggestedUsers", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req, res) => {
  const { fullName, email, username, currentPassword, newPassword, bio, link } =
    req.body;

  // for profile image and cover image cause we will reasign the values
  let { profileImg, coverImg } = req.body;

  const userId = req.user._id;

  try {
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user passed both currentPassword and new Password

    if (
      (!newPassword && currentPassword) ||
      (!currentPassword && newPassword)
    ) {
      return res.status(400).json({
        error: "Please provide both currentPassword and newPassword",
      });
    }

    if (currentPassword && newPassword) {
      //check if currentPassword is correct or not between currentPassword the user entered and database password
      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
        return res.status(400).json({ error: "Current Password is incorrect" });
      }

      //check newPassword length
      if (newPassword.length < 6) {
        return res.status(400).json({
          error: "New Password must be at least 6 characters long",
        });
      }
      //hash the newPassword
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // if user wants to update his profile image and cover image
    // we will use cloudinary to upload the image or update the image
    if (profileImg) {
      // first we have to delete the old one from cloudinary
      if (user.profileImg) {
        // we need to get the id of the image so when we say split / .pop(pop returns the last value) we will reach the id.png then split the . and take the 0 value
        await cloudinary.uploader.destroy(
          user.profileImg.split("/").pop().split(".")[0]
        );
      }
      // now upload the new one to cloudinary after deleting the old
      const uploadedResponse = await cloudinary.uploader.upload(profileImg);
      profileImg = uploadedResponse.secure_url; // to replace the local url with the hosted url from cloudinary
    }

    if (coverImg) {
      if (user.coverImg) {
        await cloudinary.uploader.destroy(
          user.coverImg.split("/").pop().split(".")[0]
        );
      }
      const uploadedResponse = await cloudinary.uploader.upload(coverImg);
      coverImg = uploadedResponse.secure_url; // to replace the local url with the hosted url from cloudinary
    }

    // if value passed then update in database else keep the old value
    user.fullName = fullName || user.fullName;
    user.email = email || email;
    user.username = username || user.username;
    user.bio = bio || user.bio;
    user.link = link || user.link;
    user.profileImg = profileImg || user.profileImg;
    user.coverImg = coverImg || user.coverImg;

    // save to database
    user = await user.save();

    // password should be null in the response
    user.password = null;
    return res.status(200).json(user);
  } catch (error) {
    console.log("Error in updateUser", error.message);
    res.status(500).json({ error: error.message });
  }
};
