import cloudinary from "../config/cloudinary";
import { UploadApiResponse, ResourceType } from "cloudinary";

function mimeToResourceType(mime: string): ResourceType {
  if (mime.startsWith("video/")) return "video";
  // PDFs upload as "image" so Cloudinary can generate page thumbnails
  // and serve them inline via /image/upload/
  return "image";
}

interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  originalFilename: string;
}

/**
 * Upload a file to Cloudinary
 * @param filePath - Path to the file to upload
 * @param folder - Cloudinary folder name (default: 'private-labels')
 * @param filename - Original filename
 * @returns Upload result with URL and metadata
 */
export const uploadToCloudinary = async (
  filePath: string,
  folder: string = "private-labels",
  filename: string = "label",
  mime?: string
): Promise<UploadResult> => {
  try {
    const resource_type: ResourceType = mime ? mimeToResourceType(mime) : "auto";
    const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type,
      use_filename: true,
      unique_filename: true,
      access_mode: "public",
    });

    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      originalFilename: filename,
    };
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    throw new Error(`Failed to upload file to Cloudinary: ${error.message}`, { cause: error });
  }
};

/**
 * Delete a file from Cloudinary
 * @param publicId - Cloudinary public ID of the file
 * @returns Deletion result
 */
export const deleteFromCloudinary = async (publicId: string): Promise<any> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error: any) {
    console.error("Cloudinary deletion error:", error);
    throw new Error(`Failed to delete file from Cloudinary: ${error.message}`, { cause: error });
  }
};

/**
 * Upload multiple files to Cloudinary
 * @param files - Array of file paths
 * @param folder - Cloudinary folder name
 * @returns Array of upload results
 */
export const uploadMultipleToCloudinary = async (
  files: Array<{ path: string; originalname: string }>,
  folder: string = "private-labels"
): Promise<UploadResult[]> => {
  try {
    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file.path, folder, file.originalname)
    );
    return await Promise.all(uploadPromises);
  } catch (error: any) {
    console.error("Multiple upload error:", error);
    throw new Error(`Failed to upload files: ${error.message}`, { cause: error });
  }
};
