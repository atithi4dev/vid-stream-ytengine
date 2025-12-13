import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import logger from "../logger/logger.js";

export async function connectDB() {
  const connect = async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log("MongoDB connected");
    } catch (err) {
      console.error("MongoDB connection failed, retrying in 5s");
      setTimeout(connect, 5000);
    }
  };

  connect();
}


export default connectDB;