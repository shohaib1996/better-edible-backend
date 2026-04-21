import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { DigitalAsset } from "../models/DigitalAsset";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import { cleanupTempFiles } from "../middleware/uploadMiddleware";

// GET /api/digital-assets
export const getAssets = asyncHandler(async (req, res) => {
  const { category, productLine, status, search } = req.query;

  const filter: Record<string, unknown> = { status: status || "active" };
  if (category) filter.category = category;
  if (productLine) filter.productLine = productLine;
  if (search) filter.title = { $regex: search, $options: "i" };

  const assets = await DigitalAsset.find(filter).sort({ createdAt: -1 });

  res.status(200).json({ success: true, assets });
});

// GET /api/digital-assets/:id
export const getAssetById = asyncHandler(async (req, res) => {
  const asset = await DigitalAsset.findById(req.params.id);
  if (!asset) throw new AppError("Asset not found", 404);

  res.status(200).json({ success: true, asset });
});

// POST /api/digital-assets
export const createAsset = asyncHandler(async (req, res) => {
  const { title, description, category, productLine, assetType, textContent, tags, uploadedBy } =
    req.body;

  if (!title || !category || !assetType) {
    throw new AppError("title, category and assetType are required", 400);
  }
  if (assetType === "text" && !textContent) {
    throw new AppError("textContent is required for text assets", 400);
  }
  if (assetType === "file" && !req.file) {
    throw new AppError("A file is required for file assets", 400);
  }

  let fileUrl: string | undefined;
  let previewUrl: string | undefined;

  if (assetType === "file" && req.file) {
    const result = await uploadToCloudinary(req.file.path, "digital-assets", req.file.originalname);
    cleanupTempFiles([req.file]);
    fileUrl = result.secureUrl;
    // For images use the same URL as preview; for other types leave previewUrl undefined
    if (req.file.mimetype.startsWith("image/")) {
      previewUrl = result.secureUrl;
    }
  }

  const asset = await DigitalAsset.create({
    title,
    description,
    category,
    productLine: productLine || null,
    assetType,
    fileUrl,
    previewUrl,
    textContent,
    tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
    uploadedBy,
  });

  res.status(201).json({ success: true, asset });
});

// PUT /api/digital-assets/:id
export const updateAsset = asyncHandler(async (req, res) => {
  const asset = await DigitalAsset.findById(req.params.id);
  if (!asset) throw new AppError("Asset not found", 404);

  const { title, description, category, productLine, textContent, tags, status } = req.body;

  if (title !== undefined) asset.title = title;
  if (description !== undefined) asset.description = description;
  if (category !== undefined) asset.category = category;
  if (productLine !== undefined) asset.productLine = productLine || null;
  if (textContent !== undefined) asset.textContent = textContent;
  if (tags !== undefined) asset.tags = Array.isArray(tags) ? tags : [tags];
  if (status !== undefined) asset.status = status;

  await asset.save();

  res.status(200).json({ success: true, asset });
});

// DELETE /api/digital-assets/:id
export const deleteAsset = asyncHandler(async (req, res) => {
  const asset = await DigitalAsset.findByIdAndDelete(req.params.id);
  if (!asset) throw new AppError("Asset not found", 404);

  res.status(200).json({ success: true, message: "Asset deleted" });
});
