import express from "express";
import authRoutes from "./routes/auth.routes.js";
import dotenv from "dotenv";
import connectMongoDB from "./db/connectMongoDB.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log("Listening to Port: " + PORT);
  connectMongoDB();
});
