import express from "express";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import notificationRoutes from "./routes/notification.route.js";

import dotenv from "dotenv";
import connectMongoDB from "./db/connectMongoDB.js";
import cookieParser from "cookie-parser";

import { v2 as cloudinary } from "cloudinary";

dotenv.config();

// configure cloudinary account to upload and delete images
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const app = express();

const PORT = process.env.PORT || 5000;
// to limit images sizes but shouldnt be too high to prevent DOS
app.use(express.json({ limit: "5mb" })); // to parse req.body
app.use(express.urlencoded({ extended: true })); // to parse form data(urlencoded)

app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);

app.listen(PORT, () => {
  console.log("Listening to Port: " + PORT);
  connectMongoDB();
});
