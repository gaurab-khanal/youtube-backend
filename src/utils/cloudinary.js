import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfully
    console.log("File is uploaded on cloudinary: ", response.url);
    fs.unlink(localFilePath, (err) => {
      if (err) {
        console.log("Error while deleting file: ", err);
      } else {
        console.log("File deleted successfully");
      }
    });
    return response;
  } catch (error) {
    console.log("er: ", error);
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

const deleteOnCloudinray = async (fileId) => {
  try {
    console.log("File id: ", fileId);
    const response = await cloudinary.uploader.destroy(fileId);
    return response;
  } catch (error) {
    console.log("Error: ", error);
  }
};

export { uploadOnCloudinary, deleteOnCloudinray };
