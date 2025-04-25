import Notification from "../models/notification.model.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ to: userId }).populate({
      path: "from",
      select: "username profileImg",
    });

    //update the notfifications as read
    await Notification.updateMany({ to: userId }, { read: true });

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.log("Error in getNotifications controller", error);
  }
};

export const deleteNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    // delete those that are sent to us
    await Notification.deleteMany({ to: userId });

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.log("Error in deleteNotifications controller", error);
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const notificationId = req.params.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.to.toString() !== userId.toString()) {
      res
        .status(403)
        .json({ error: "You are not allowed to delete this notification" });
    }

    // delete the notification that is sent to us
    await Notification.findByIdAndDelete(notificationId);
    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
    console.log("Error in deleteNotification controller", error);
  }
};
