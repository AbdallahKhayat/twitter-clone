import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

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

      //TODO: return the id of the user as a response so that we can update the UI immediately
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
      //TODO: return the id of the user as a response so that we can update the UI immediately
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
