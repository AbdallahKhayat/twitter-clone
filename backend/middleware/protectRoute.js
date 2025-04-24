import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const protectRoute = async (req, res, next) => {
  try {
    //first get the token from the cookies
    const token = req.cookies.jwt;

    // check if unautherized
    if (!token) {
      return res.status(401).json({ error: "Unautherized No Token Provided" });
    }
    //if there is a token then lets decode it (Veify with the secret in .env)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // returns falsy value or expired
    if (!decoded) {
      return res.status(401).json({ error: "Unautherized: Invalid Token" });
    }

    // we want to return the user but not the password to add it to req object (userId is from payload)
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ error: " User Not Found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("Error in protectRoute middleware", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
