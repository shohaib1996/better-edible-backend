import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { DigitalAsset } from "../models/DigitalAsset";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import { cleanupTempFiles } from "../middleware/uploadMiddleware";

// GET /api/digital-assets
export const getAssets = asyncHandler(async (req, res) => {
  const { category, productLine, assetType, status, search, page, limit } = req.query;

  const filter: Record<string, unknown> =
    status && status !== "all" ? { status } : { status: { $in: ["active", "archived"] } };
  if (category) filter.category = category;
  if (productLine) filter.productLine = productLine;
  if (assetType) filter.assetType = assetType;
  if (search) filter.title = { $regex: search, $options: "i" };

  // When status=all (tab counts query) return everything unpaginated
  if (!page && !limit) {
    const assets = await DigitalAsset.find(filter).sort({ createdAt: -1 });
    return res
      .status(200)
      .json({ success: true, assets, totalItems: assets.length, totalPages: 1, currentPage: 1 });
  }

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [assets, totalItems] = await Promise.all([
    DigitalAsset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    DigitalAsset.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    assets,
    totalItems,
    totalPages: Math.ceil(totalItems / limitNum),
    currentPage: pageNum,
  });
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
    const mime = req.file.mimetype;
    const result = await uploadToCloudinary(
      req.file.path,
      "digital-assets",
      req.file.originalname,
      mime
    );
    cleanupTempFiles([req.file]);
    fileUrl = result.secureUrl;

    if (mime.startsWith("image/")) {
      previewUrl = result.secureUrl;
    } else if (mime === "application/pdf") {
      // PDF uploaded as image resource_type — Cloudinary generates a page thumbnail
      previewUrl = result.secureUrl.replace(/\.pdf$/i, ".jpg");
    } else if (mime.startsWith("video/")) {
      previewUrl = result.secureUrl
        .replace("/video/upload/", "/video/upload/so_0/")
        .replace(/\.[^.]+$/, ".jpg");
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

  if (req.file) {
    const mime = req.file.mimetype;
    const result = await uploadToCloudinary(
      req.file.path,
      "digital-assets",
      req.file.originalname,
      mime
    );
    cleanupTempFiles([req.file]);
    asset.fileUrl = result.secureUrl;

    if (mime.startsWith("image/")) {
      asset.previewUrl = result.secureUrl;
    } else if (mime === "application/pdf") {
      asset.previewUrl = result.secureUrl.replace(/\.pdf$/i, ".jpg");
    } else if (mime.startsWith("video/")) {
      asset.previewUrl = result.secureUrl
        .replace("/video/upload/", "/video/upload/so_0/")
        .replace(/\.[^.]+$/, ".jpg");
    }
  }

  await asset.save();

  res.status(200).json({ success: true, asset });
});

// DELETE /api/digital-assets/:id
export const deleteAsset = asyncHandler(async (req, res) => {
  const asset = await DigitalAsset.findByIdAndDelete(req.params.id);
  if (!asset) throw new AppError("Asset not found", 404);

  res.status(200).json({ success: true, message: "Asset deleted" });
});
