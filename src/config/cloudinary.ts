import { v2 as cloudinary } from 'cloudinary';

// Lazy configuration - only configure when first used
let isConfigured = false;

const ensureConfigured = () => {
  if (!isConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    isConfigured = true;

    console.log('✅ Cloudinary configured:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'MISSING',
    });
  }
};

// Wrap cloudinary to ensure configuration before use
const configuredCloudinary = {
  uploader: {
    upload: (file: string, options?: any) => {
      ensureConfigured();
      return cloudinary.uploader.upload(file, options);
    },
    destroy: (publicId: string, options?: any) => {
      ensureConfigured();
      return cloudinary.uploader.destroy(publicId, options);
    },
  },
};

export default configuredCloudinary;
