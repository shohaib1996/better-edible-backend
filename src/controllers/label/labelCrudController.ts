import mongoose from "mongoose";
import { Label } from "../../models/Label";
import { PrivateLabelClient } from "../../models/PrivateLabelClient";
import { uploadMultipleToCloudinary, deleteFromCloudinary } from "../../utils/cloudinaryUpload";
import { cleanupTempFiles } from "../../middleware/uploadMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import {
  getUnitPriceByProductType,
  isValidProductType,
  populateStageHistory,
} from "./labelHelpers";

// GET /api/labels
export const getAllLabels = asyncHandler(async (req, res) => {
  const { clientId, stage, productType, page = 1, limit = 50 } = req.query;

  const filter: any = { source: { $ne: "store" } };

  if (clientId && mongoose.Types.ObjectId.isValid(String(clientId))) {
    filter.client = new mongoose.Types.ObjectId(String(clientId));
  }
  if (stage && typeof stage === "string") filter.currentStage = stage;
  if (productType && typeof productType === "string") filter.productType = productType;

  const skip = (Number(page) - 1) * Number(limit);

  const [labels, total] = await Promise.all([
    Label.find(filter)
      .populate({ path: "client", populate: { path: "store", select: "name city state" } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Label.countDocuments(filter),
  ]);

  const populatedLabels = await populateStageHistory(labels);

  res.json({ total, labels: populatedLabels, page: Number(page), limit: Number(limit) });
});

// GET /api/labels/:id
export const getLabelById = asyncHandler(async (req, res) => {
  const label = await Label.findById(req.params.id).populate({
    path: "client",
    populate: { path: "store", select: "name address city state zip" },
  });

  if (!label) throw new AppError("Label not found", 404);

  const [populatedLabel] = await populateStageHistory([label]);
  res.json(populatedLabel);
});

// GET /api/labels/client/:clientId/approved
export const getApprovedLabelsByClient = asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    throw new AppError("Invalid client ID", 400);
  }

  const labels = await Label.find({
    client: new mongoose.Types.ObjectId(clientId),
    currentStage: "ready_for_production",
  }).select(
    "_id flavorName productType cannabinoidMix color flavorComponents colorComponents labelImages"
  );

  const labelsWithPricing = await Promise.all(
    labels.map(async (label) => ({
      ...label.toObject(),
      unitPrice: await getUnitPriceByProductType(label.productType),
    }))
  );

  res.json(labelsWithPricing);
});

// POST /api/labels
export const createLabel = asyncHandler(async (req, res) => {
  const {
    clientId,
    flavorName,
    productType,
    specialInstructions,
    cannabinoidMix,
    color,
    flavorComponents,
    colorComponents,
    userId,
    userType,
    submissionLabelId,
    gummyColorHex,
    gummyColorName,
    selectedFlavors,
    flavorMode,
    size,
    oilType,
    effect,
    cannabinoids,
    unitsOrdered,
    unitCost,
    totalCost,
  } = req.body;

  const client = await PrivateLabelClient.findById(clientId);
  if (!client) throw new AppError("Client not found", 404);

  if (!flavorName || flavorName.trim() === "") throw new AppError("Flavor name is required", 400);

  if (!productType || !(await isValidProductType(productType))) {
    throw new AppError("Invalid or inactive product type", 400);
  }

  const normalizedUserType = userType
    ? ((userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase()) as "Admin" | "Rep")
    : undefined;

  let parsedFlavorComponents: any[] = [];
  let parsedColorComponents: any[] = [];
  try {
    if (flavorComponents) parsedFlavorComponents = JSON.parse(flavorComponents);
    if (colorComponents) parsedColorComponents = JSON.parse(colorComponents);
  } catch {
    throw new AppError("Invalid formulation data format", 400);
  }

  for (const comp of parsedFlavorComponents) {
    if (!comp.name || comp.name.trim() === "")
      throw new AppError("Each flavor component must have a name", 400);
    if (comp.percentage === undefined || comp.percentage === null)
      throw new AppError("Each flavor component must have a percentage", 400);
  }

  for (const comp of parsedColorComponents) {
    if (!comp.name || comp.name.trim() === "")
      throw new AppError("Each color component must have a name", 400);
    if (comp.percentage === undefined || comp.percentage === null)
      throw new AppError("Each color component must have a percentage", 400);
  }

  const files = (req as any).files as Express.Multer.File[];
  let labelImages: any[] = [];

  if (files && files.length > 0) {
    try {
      const uploadResults = await uploadMultipleToCloudinary(files, "private-labels");
      labelImages = uploadResults.map((result) => ({
        url: result.url,
        secureUrl: result.secureUrl,
        publicId: result.publicId,
        format: result.format,
        bytes: result.bytes,
        originalFilename: result.originalFilename,
        uploadedAt: new Date(),
      }));
      cleanupTempFiles(files);
    } catch (uploadError: any) {
      cleanupTempFiles(files);
      throw new AppError(`Failed to upload images: ${uploadError.message}`, 500);
    }
  }

  const label = await Label.create({
    client: clientId,
    flavorName: flavorName.trim(),
    productType,
    specialInstructions: specialInstructions?.trim() || "",
    cannabinoidMix: cannabinoidMix?.trim() || "",
    color: color?.trim() || "",
    flavorComponents: parsedFlavorComponents,
    colorComponents: parsedColorComponents,
    currentStage: "design_in_progress",
    labelImages,
    ...(submissionLabelId && mongoose.Types.ObjectId.isValid(submissionLabelId)
      ? { submissionLabelId: new mongoose.Types.ObjectId(submissionLabelId) }
      : {}),
    ...(gummyColorHex && { gummyColorHex }),
    ...(gummyColorName && { gummyColorName }),
    ...(selectedFlavors && {
      selectedFlavors: Array.isArray(selectedFlavors)
        ? selectedFlavors
        : JSON.parse(selectedFlavors),
    }),
    ...(flavorMode && { flavorMode }),
    ...(size && { size }),
    ...(oilType && { oilType }),
    ...(effect && { effect }),
    ...(unitsOrdered && { unitsOrdered: Number(unitsOrdered) }),
    ...(cannabinoids && {
      cannabinoids: Array.isArray(cannabinoids) ? cannabinoids : JSON.parse(cannabinoids),
    }),
    ...(unitCost != null && { unitCost: Number(unitCost) }),
    ...(totalCost != null && { totalCost: Number(totalCost) }),
    stageHistory: [
      {
        stage: "design_in_progress",
        changedBy: userId || undefined,
        changedByType: normalizedUserType || undefined,
        changedAt: new Date(),
        notes: "Label created",
      },
    ],
  });

  await label.populate({ path: "client", populate: { path: "store", select: "name" } });

  res.status(201).json({ message: "Label created successfully", label });
});

// PATCH /api/labels/:id
export const updateLabel = asyncHandler(async (req, res) => {
  const label = await Label.findById(req.params.id);
  if (!label) throw new AppError("Label not found", 404);

  const {
    flavorName,
    productType,
    specialInstructions,
    cannabinoidMix,
    color,
    flavorComponents,
    colorComponents,
    keepExistingImages,
    gummyColorHex,
    gummyColorName,
    selectedFlavors,
    flavorMode,
    size,
    oilType,
    effect,
    cannabinoids,
    unitsOrdered,
    unitCost,
    totalCost,
  } = req.body;

  if (flavorName !== undefined) {
    if (!flavorName.trim()) throw new AppError("Flavor name cannot be empty", 400);
    label.flavorName = flavorName.trim();
  }

  if (productType !== undefined) {
    if (!(await isValidProductType(productType)))
      throw new AppError("Invalid or inactive product type", 400);
    label.productType = productType;
  }

  if (specialInstructions !== undefined) label.specialInstructions = specialInstructions.trim();
  if (cannabinoidMix !== undefined) label.cannabinoidMix = cannabinoidMix.trim();
  if (color !== undefined) label.color = color.trim();

  if (flavorComponents !== undefined) {
    try {
      label.flavorComponents = JSON.parse(flavorComponents);
    } catch {
      throw new AppError("Invalid flavor components format", 400);
    }
  }

  if (colorComponents !== undefined) {
    try {
      label.colorComponents = JSON.parse(colorComponents);
    } catch {
      throw new AppError("Invalid color components format", 400);
    }
  }

  if (gummyColorHex !== undefined) label.gummyColorHex = gummyColorHex || undefined;
  if (gummyColorName !== undefined) label.gummyColorName = gummyColorName || undefined;
  if (selectedFlavors !== undefined) {
    try {
      label.selectedFlavors = Array.isArray(selectedFlavors)
        ? selectedFlavors
        : JSON.parse(selectedFlavors);
    } catch {
      throw new AppError("Invalid selectedFlavors format", 400);
    }
  }
  if (flavorMode === "single" || flavorMode === "mix") label.flavorMode = flavorMode;

  if (size !== undefined) (label as any).size = size || undefined;
  if (oilType !== undefined) (label as any).oilType = oilType || undefined;
  if (effect !== undefined) (label as any).effect = effect || undefined;
  if (unitsOrdered !== undefined)
    (label as any).unitsOrdered = unitsOrdered ? Number(unitsOrdered) : undefined;
  if (unitCost !== undefined) (label as any).unitCost = unitCost ? Number(unitCost) : undefined;
  if (totalCost !== undefined) (label as any).totalCost = totalCost ? Number(totalCost) : undefined;
  if (cannabinoids !== undefined) {
    try {
      (label as any).cannabinoids = Array.isArray(cannabinoids)
        ? cannabinoids
        : JSON.parse(cannabinoids);
    } catch {
      throw new AppError("Invalid cannabinoids format", 400);
    }
  }

  const files = (req as any).files as Express.Multer.File[];
  let updatedImages = [...label.labelImages];

  const imagesToKeep =
    typeof keepExistingImages === "string"
      ? JSON.parse(keepExistingImages)
      : keepExistingImages || [];

  const imagesToDelete = updatedImages.filter((img: any) => !imagesToKeep.includes(img.publicId));
  for (const img of imagesToDelete) {
    try {
      await deleteFromCloudinary(img.publicId);
    } catch (err) {
      console.error(`Failed to delete image ${img.publicId}:`, err);
    }
  }

  updatedImages = updatedImages.filter((img: any) => imagesToKeep.includes(img.publicId));

  if (files && files.length > 0) {
    try {
      const uploadResults = await uploadMultipleToCloudinary(files, "private-labels");
      const newImages = uploadResults.map((result) => ({
        url: result.url,
        secureUrl: result.secureUrl,
        publicId: result.publicId,
        format: result.format,
        bytes: result.bytes,
        originalFilename: result.originalFilename,
        uploadedAt: new Date(),
      }));
      updatedImages = [...updatedImages, ...newImages];
      cleanupTempFiles(files);
    } catch (uploadError: any) {
      cleanupTempFiles(files);
      throw new AppError(`Failed to upload images: ${uploadError.message}`, 500);
    }
  }

  label.labelImages = updatedImages;
  await label.save();

  res.json({ message: "Label updated successfully", label });
});

// DELETE /api/labels/:id
export const deleteLabel = asyncHandler(async (req, res) => {
  const label = await Label.findById(req.params.id);
  if (!label) throw new AppError("Label not found", 404);

  const { ClientOrder } = await import("../../models/ClientOrder");
  const ordersWithLabel = await ClientOrder.find({ "items.label": label._id });

  if (ordersWithLabel.length > 0) {
    throw new AppError("Cannot delete label that is used in orders", 400);
  }

  for (const img of label.labelImages) {
    try {
      await deleteFromCloudinary(img.publicId);
    } catch (err) {
      console.error(`Failed to delete image ${img.publicId}:`, err);
    }
  }

  await Label.findByIdAndDelete(req.params.id);

  res.json({ message: "Label deleted successfully" });
});
