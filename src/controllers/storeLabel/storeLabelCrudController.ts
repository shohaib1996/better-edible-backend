import { Types } from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { Label } from "../../models/Label";
import { PrivateLabelClient } from "../../models/PrivateLabelClient";
import { calculateGummyPrice } from "../../utils/gummyPricing";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";
import { cleanupTempFiles } from "../../middleware/uploadMiddleware";
import { getOrCreateClient } from "./storeLabelHelpers";
import { getProductTypeByOilType } from "../label/labelHelpers";

const APPROVED_STAGES = ["olcc_approved", "print_order_submitted", "ready_for_production"];

// GET /api/store/labels
export const getMyLabels = asyncHandler(async (req, res) => {
  const { storeId, status, stageGroup, page, limit } = req.query;
  if (!storeId) throw new AppError("storeId is required", 400);

  const client = await PrivateLabelClient.findOne({ store: new Types.ObjectId(storeId as string) });
  if (!client) {
    return res.status(200).json({ success: true, labels: [], clientStatus: null });
  }

  const filter: Record<string, any> = { client: client._id };

  if (stageGroup === "approved") {
    // Show admin-managed labels only (source != "store") — avoids duplicating store submission records
    filter.source = { $ne: "store" };
    filter.currentStage = { $in: APPROVED_STAGES };
  } else {
    filter.source = "store";
    if (status) filter.labelStatus = status as string;
    if (stageGroup === "in_progress") filter.currentStage = { $nin: APPROVED_STAGES };
  }

  if (page && limit) {
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 10);
    const skip = (pageNum - 1) * limitNum;
    const [totalItems, labels] = await Promise.all([
      Label.countDocuments(filter),
      Label.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    ]);
    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    return res.status(200).json({
      success: true,
      labels,
      clientStatus: client.status,
      clientId: client._id,
      pagination: { page: pageNum, limit: limitNum, totalItems, totalPages },
    });
  }

  const labels = await Label.find(filter).sort({ createdAt: -1 });
  res
    .status(200)
    .json({ success: true, labels, clientStatus: client.status, clientId: client._id });
});

// GET /api/store/labels/my-rep
export const getMyRep = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) throw new AppError("storeId is required", 400);

  const client = await PrivateLabelClient.findOne({
    store: new Types.ObjectId(storeId as string),
  }).populate<{ assignedRep: { name: string; email?: string } }>("assignedRep", "name email");

  if (!client) return res.status(200).json({ success: true, rep: null });

  const rep = client.assignedRep as any;
  res.status(200).json({
    success: true,
    rep: rep ? { name: rep.name ?? "", email: rep.email ?? "" } : null,
  });
});

// POST /api/store/labels/upload-logo
export const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("No file uploaded", 400);

  const result = await uploadToCloudinary(
    req.file.path,
    "private-label-logos",
    req.file.originalname,
    req.file.mimetype
  );

  cleanupTempFiles([req.file]);

  res.status(200).json({ success: true, url: result.secureUrl });
});

// POST /api/store/labels
export const createDraftLabel = asyncHandler(async (req, res) => {
  const {
    storeId,
    flavorName,
    size,
    oilType,
    effect,
    flavorMode,
    cannabinoids,
    unitsOrdered,
    specialInstructions,
    gummyColorHex,
    gummyColorName,
    selectedFlavors,
  } = req.body;

  if (!storeId) throw new AppError("storeId is required", 400);
  if (!flavorName) throw new AppError("flavorName is required", 400);

  const client = await getOrCreateClient(storeId);

  const units = unitsOrdered || 630;
  const config = {
    size: size || "standard",
    oilType: oilType || "biomax",
    effect: effect || "hybrid",
    flavorMode: flavorMode || "single",
    cannabinoids: cannabinoids || [],
    unitsOrdered: units,
  };

  const pricing = calculateGummyPrice(config);
  const resolvedProductType = await getProductTypeByOilType(config.oilType);

  const label = await Label.create({
    client: client._id,
    flavorName,
    productType: resolvedProductType ?? "",
    specialInstructions: specialInstructions || "",
    size: config.size,
    oilType: config.oilType,
    effect: config.effect,
    flavorMode: config.flavorMode,
    cannabinoids: pricing.breakdown.cannabinoids,
    unitsOrdered: units,
    unitCost: pricing.unitCost,
    totalCost: pricing.totalCost,
    isRatio: pricing.isRatio,
    testingFee: pricing.testingFee,
    testingFeeWaived: pricing.testingFeeWaived,
    labelStatus: "draft",
    source: "store",
    currentStage: "design_in_progress",
    ...(Array.isArray(selectedFlavors) && { selectedFlavors }),
    ...(gummyColorHex && { gummyColorHex }),
    ...(gummyColorName && { gummyColorName }),
  });

  res.status(201).json({ success: true, label });
});

// PUT /api/store/labels/:id
export const updateDraftLabel = asyncHandler(async (req, res) => {
  const label = await Label.findById(req.params.id);
  if (!label) throw new AppError("Label not found", 404);
  if (label.labelStatus !== "draft") throw new AppError("Only draft labels can be edited", 400);

  const {
    flavorName,
    size,
    oilType,
    effect,
    flavorMode,
    cannabinoids,
    unitsOrdered,
    specialInstructions,
    selectedFlavors: updatedFlavors,
    gummyColorHex: updatedColorHex,
    gummyColorName: updatedColorName,
  } = req.body;

  if (flavorName !== undefined) label.flavorName = flavorName;
  if (specialInstructions !== undefined) label.specialInstructions = specialInstructions;
  if (Array.isArray(updatedFlavors)) label.selectedFlavors = updatedFlavors;
  if (updatedColorHex !== undefined) label.gummyColorHex = updatedColorHex;
  if (updatedColorName !== undefined) label.gummyColorName = updatedColorName;

  const config = {
    size: size ?? label.size ?? "standard",
    oilType: oilType ?? label.oilType ?? "biomax",
    effect: effect ?? label.effect ?? "hybrid",
    flavorMode: flavorMode ?? label.flavorMode ?? "single",
    cannabinoids: cannabinoids ?? label.cannabinoids ?? [],
    unitsOrdered: unitsOrdered ?? label.unitsOrdered ?? 630,
  };

  const pricing = calculateGummyPrice(config);

  label.size = config.size;
  label.oilType = config.oilType;
  label.effect = config.effect;
  label.flavorMode = config.flavorMode;
  label.cannabinoids = pricing.breakdown.cannabinoids as any;
  label.unitsOrdered = config.unitsOrdered;
  label.unitCost = pricing.unitCost;
  label.totalCost = pricing.totalCost;
  label.isRatio = pricing.isRatio;
  label.testingFee = pricing.testingFee;
  label.testingFeeWaived = pricing.testingFeeWaived;
  const resolvedProductType = await getProductTypeByOilType(config.oilType);
  if (resolvedProductType) label.productType = resolvedProductType;

  await label.save();

  res.status(200).json({ success: true, label });
});

// POST /api/store/labels/gummy-color  — proxies external AI color API (avoids browser CORS)
export const gummyColorProxy = asyncHandler(async (req, res) => {
  const { flavor } = req.body;
  if (!flavor || typeof flavor !== "string") throw new AppError("flavor is required", 400);

  const upstream = await fetch(
    "https://gummycolor-kceb6nqy.manus.space/api/trpc/color.generate?batch=1",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "0": { json: { flavor } } }),
    }
  );

  if (!upstream.ok) throw new AppError("Color API error", 502);

  const data = (await upstream.json()) as any[];
  const json = data?.[0]?.result?.data?.json;
  if (!json?.hex) throw new AppError("Invalid response from color API", 502);

  res.status(200).json({ success: true, ...json });
});

// PATCH /api/store/labels/:id/recipe-data — update AI recipe fields on any label status
export const updateLabelRecipeData = asyncHandler(async (req, res) => {
  const label = await Label.findById(req.params.id);
  if (!label) throw new AppError("Label not found", 404);

  const { selectedFlavors, gummyColorHex, gummyColorName } = req.body;

  if (Array.isArray(selectedFlavors)) label.selectedFlavors = selectedFlavors;
  if (gummyColorHex !== undefined) label.gummyColorHex = gummyColorHex || undefined;
  if (gummyColorName !== undefined) label.gummyColorName = gummyColorName || undefined;

  await label.save();
  res.status(200).json({ success: true, label });
});

// DELETE /api/store/labels/:id
export const deleteDraftLabel = asyncHandler(async (req, res) => {
  const label = await Label.findById(req.params.id);
  if (!label) throw new AppError("Label not found", 404);
  if (label.labelStatus !== "draft") throw new AppError("Only draft labels can be deleted", 400);

  await label.deleteOne();

  res.status(200).json({ success: true, message: "Draft label deleted" });
});
