import mongoose from "mongoose";
import logger from "../logger/logger.js";
import { env } from "../config/env.js";

export async function connectDB() {
    const MAX_RETRIES = 5;
    let retry_count = 0;
    let timer = 1;
    
    const connect = async () =>{
      try {
        await mongoose.connect(env.MONGO_URI+"vidtube", {
          serverSelectionTimeoutMS: 5000,
        });
        logger.info("MongoDb connected");
      } catch (error) {
        if(retry_count < MAX_RETRIES){
          setTimeout(connect, timer*1000);
          logger.warn(`MongoDB connection retry ${retry_count+1} in ${timer}s`)
          retry_count++;
          timer++;
        }else{
          logger.error("Max retries ended , Unable to connect to MongoDB instance.")
        }
      }
    }

    connect();
}

export default connectDB;