import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
import logger from "../../logger/logger.js";
import path from "path";
dotenv.config();

// Configuration Of Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "images",
    });

    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const uploadVideoOnCloudinary = async (localFilePath) => {
  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "video",
      folder: "videos",
    });
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    logger.error("Error deleting from Cloudinary:", error);
    return null;
  }
};

const walkDir = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath, fileList); // Recurse into subfolders
    } else {
      fileList.push(filePath); // Store full file path
    }
  });

  return fileList;
};

const uploadFolderToCloudinary = async (localFolderPath, cloudFolderName) => {
  try {
    console.log("📂 Uploading folder recursively...");

    const allFiles = walkDir(localFolderPath);
    const uploadResults = [];

    for (const fullPath of allFiles) {
      const relativePath = path.relative(localFolderPath, fullPath); // e.g., '720p/chunk2.ts'
      const ext = path.extname(fullPath).toLowerCase();

      const resourceType =
        ext === ".mp4" || ext === ".mov" || ext === ".ts"
          ? "video"
          : "image";

      const cloudinaryPath = path.join(cloudFolderName, path.dirname(relativePath)).replace(/\\/g, "/");

      console.log(`⬆️ Uploading: ${fullPath} → Cloud: ${cloudinaryPath}`);

      const result = await cloudinary.uploader.upload(fullPath, {
        folder: cloudinaryPath,
        resource_type: resourceType,
      });

      uploadResults.push(result);
      fs.unlinkSync(fullPath);
    }

    return uploadResults;
  } catch (error) {
    logger.error("❌ Error uploading deep folder to Cloudinary:", error);
    console.error(error);
    return null;
  }
};

const deleteFolderOnCloudinary = async (folderName) => {
  try {
    // Step 1: Delete all resources in the folder
    await cloudinary.api.delete_resources_by_prefix(`${folderName}/`, {
      resource_type: "auto",
    });

    // Step 2: Delete the folder itself
    const result = await cloudinary.api.delete_folder(folderName);
    return result;
  } catch (error) {
    logger.error("Error deleting folder from Cloudinary:", error);
    return null;
  }
};


const deleteVideoFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
    });
  } catch (error) {
    logger.error("Error deleting video from Cloudinary:", error);
    return null;
  }
};
export {
  uploadFolderToCloudinary,
deleteFolderOnCloudinary,
  uploadOnCloudinary,
  uploadVideoOnCloudinary,
  deleteFromCloudinary,
  deleteVideoFromCloudinary,
};
