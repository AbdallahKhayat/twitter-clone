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
      res.status(200).json({ message: "User followed successfully" });
    }
  } catch (error) {
    console.log("Error in followUnfollowUser", error.message);
    res.status(500).json({ error: error.message });
  }
};
