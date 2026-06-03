import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { Label, LABEL_STAGES } from "../models/Label";
import { PrivateLabelClient } from "../models/PrivateLabelClient";
import { GummyPool } from "../models/GummyPool";
import { calculateGummyPrice, buildCannabinoidKey } from "../utils/gummyPricing";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import { cleanupTempFiles } from "../middleware/uploadMiddleware";
import { Types } from "mongoose";

// -------------------
// Helper: get or create PrivateLabelClient for a store
// -------------------
async function getOrCreateClient(storeId: string) {
  let client = await PrivateLabelClient.findOne({ store: new Types.ObjectId(storeId) });
  if (!client) {
    client = await PrivateLabelClient.create({
      store: new Types.ObjectId(storeId),
      status: "onboarding",
      contactEmail: "",
      assignedRep: new Types.ObjectId("000000000000000000000000"), // placeholder, admin updates
      recurringSchedule: { enabled: false },
    });
  }
  return client;
}

// -------------------
// Helper: join or create a GummyPool entry
// -------------------
async function joinPool(
  labelId: Types.ObjectId,
  clientId: Types.ObjectId,
  storeId: Types.ObjectId,
  storeName: string,
  units: number,
  cannabinoids: { name: any; mg: number }[]
) {
  const key = buildCannabinoidKey(cannabinoids);
  let pool = await GummyPool.findOne({ cannabinoidKey: key, status: "open" });

  if (!pool) {
    pool = new GummyPool({ cannabinoidKey: key });
  }

  // Remove existing entry for this label if re-joining
  pool.entries = pool.entries.filter((e) => String(e.labelId) !== String(labelId));

  pool.entries.push({ clientId, storeId, storeName, labelId, units, joinedAt: new Date() });
  await pool.save();
  return pool;
}

// -------------------
// GET /api/store/submissions (admin)
// Returns all submitted store gummy labels grouped by store
// -------------------
export const getStoreSubmissions = asyncHandler(async (req, res) => {
  const { clientId } = req.query;

  const filter: any = {
    labelStatus: "submitted",
    $or: [{ source: "store" }, { source: { $exists: false } }, { source: null }],
  };

  if (clientId && Types.ObjectId.isValid(clientId as string)) {
    filter.client = new Types.ObjectId(clientId as string);
  }

  const labels = await Label.find(filter)
    .populate({
      path: "client",
      populate: [
        { path: "store", select: "name city state" },
        { path: "assignedRep", select: "name email" },
      ],
    })
    .sort({ submittedAt: -1 });

  // Group by store
  const map: Record<string, any> = {};

  for (const label of labels) {
    const client = label.client as any;
    const store = client?.store;
    const rep = client?.assignedRep;
    const storeId = String(store?._id ?? client?._id ?? "unknown");
    const storeName = store?.name ?? "Unknown Store";

    if (!map[storeId]) {
      map[storeId] = {
        storeId,
        storeName,
        clientId: String(client?._id),
        city: store?.city ?? "",
        state: store?.state ?? "",
        logo: client?.logo ?? null,
        rep: rep ? { name: rep.name ?? "", email: rep.email ?? "" } : null,
        labels: [],
        totalValue: 0,
        earliestSubmission: label.submittedAt,
      };
    }

    map[storeId].labels.push(label);
    map[storeId].totalValue = parseFloat(
      (map[storeId].totalValue + (label.totalCost ?? 0)).toFixed(2)
    );

    if (label.submittedAt && label.submittedAt < map[storeId].earliestSubmission) {
      map[storeId].earliestSubmission = label.submittedAt;
    }
  }

  res.status(200).json({ success: true, submissions: Object.values(map) });
});

// -------------------
// GET /api/store/labels?storeId=&status=&page=&limit=
// -------------------
export const getMyLabels = asyncHandler(async (req, res) => {
  const { storeId, status, page, limit } = req.query;
  if (!storeId) throw new AppError("storeId is required", 400);

  const client = await PrivateLabelClient.findOne({ store: new Types.ObjectId(storeId as string) });
  if (!client) {
    return res.status(200).json({ success: true, labels: [], clientStatus: null });
  }

  const filter: Record<string, any> = { client: client._id, source: "store" };
  if (status) filter.labelStatus = status as string;

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

// -------------------
// POST /api/store/labels
// -------------------
export const createDraftLabel = asyncHandler(async (req, res) => {
  const {
    storeId,
    storeName,
    flavorName,
    size,
    oilType,
    effect,
    flavorMode,
    cannabinoids,
    unitsOrdered,
    specialInstructions,
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

  const label = await Label.create({
    client: client._id,
    flavorName,
    productType: config.oilType === "rosin" ? "Rosin" : "BioMax",
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
  });

  res.status(201).json({ success: true, label });
});

// -------------------
// PUT /api/store/labels/:id
// -------------------
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
  } = req.body;

  if (flavorName !== undefined) label.flavorName = flavorName;
  if (specialInstructions !== undefined) label.specialInstructions = specialInstructions;

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
  label.productType = config.oilType === "rosin" ? "Rosin" : "BioMax";

  await label.save();

  res.status(200).json({ success: true, label });
});

// -------------------
// DELETE /api/store/labels/:id
// -------------------
export const deleteDraftLabel = asyncHandler(async (req, res) => {
  const label = await Label.findById(req.params.id);
  if (!label) throw new AppError("Label not found", 404);
  if (label.labelStatus !== "draft") throw new AppError("Only draft labels can be deleted", 400);

  await label.deleteOne();

  res.status(200).json({ success: true, message: "Draft label deleted" });
});

// -------------------
// PATCH /api/store/submissions/:labelId/stage
// -------------------
export const advanceLabelStage = asyncHandler(async (req, res) => {
  const { labelId } = req.params;
  const { stage } = req.body;

  if (!stage || !LABEL_STAGES.includes(stage)) {
    throw new AppError(`Invalid stage. Valid values: ${LABEL_STAGES.join(", ")}`, 400);
  }

  const label = await Label.findById(labelId);
  if (!label) throw new AppError("Label not found", 404);
  if (label.labelStatus !== "submitted") throw new AppError("Only submitted labels can be staged", 400);

  await label.updateStage(stage);

  res.status(200).json({ success: true, label });
});

// -------------------
// GET /api/store/labels/my-rep?storeId=
// -------------------
export const getMyRep = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) throw new AppError("storeId is required", 400);

  const client = await PrivateLabelClient.findOne({ store: new Types.ObjectId(storeId as string) })
    .populate<{ assignedRep: { name: string; email?: string } }>("assignedRep", "name email");

  if (!client) return res.status(200).json({ success: true, rep: null });

  const rep = client.assignedRep as any;
  res.status(200).json({
    success: true,
    rep: rep ? { name: rep.name ?? "", email: rep.email ?? "" } : null,
  });
});

// -------------------
// POST /api/store/labels/upload-logo
// -------------------
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

// -------------------
// POST /api/store/labels/submit
// -------------------
export const submitLine = asyncHandler(async (req, res) => {
  const { storeId, storeName, logoUrl, logoStatus, productionChoices } = req.body;

  if (!storeId) throw new AppError("storeId is required", 400);
  if (!productionChoices || !Array.isArray(productionChoices)) {
    throw new AppError("productionChoices array is required", 400);
  }

  const client = await PrivateLabelClient.findOne({ store: new Types.ObjectId(storeId) });
  if (!client) throw new AppError("No private label client found for this store", 404);

  // Update logo — only overwrite URL when actually uploading a new one
  if (logoStatus === "uploaded" && logoUrl) {
    client.logo = { url: logoUrl, status: "uploaded" };
    await client.save();
  } else if (logoStatus === "pending_email") {
    // Keep existing URL (if any), just record that they'll email it
    client.logo = { url: (client.logo as any)?.url || undefined, status: "pending_email" };
    await client.save();
  }
  // use_existing: leave client.logo completely unchanged

  // Get all draft labels for this client
  const draftLabels = await Label.find({ client: client._id, labelStatus: "draft" });
  if (draftLabels.length === 0) throw new AppError("No draft labels found to submit", 400);

  const choicesMap: Record<string, string> = {};
  for (const c of productionChoices) {
    choicesMap[c.labelId] = c.productionMode;
  }

  const updatedLabels = [];

  for (const label of draftLabels) {
    const mode = choicesMap[String(label._id)] || "standard";

    label.labelStatus = "submitted";
    label.submittedAt = new Date();
    label.productionMode = mode as "standard" | "pool" | "custom_run";
    label.currentStage = "design_in_progress";

    await label.save();

    // If pool — join the pool
    if (mode === "pool" && label.isRatio && label.cannabinoids?.length) {
      await joinPool(
        label._id as Types.ObjectId,
        client._id as Types.ObjectId,
        client.store as Types.ObjectId,
        storeName || "",
        label.unitsOrdered || 630,
        label.cannabinoids.map((c) => ({ name: c.name, mg: c.mg }))
      );
    }

    updatedLabels.push(label);
  }

  res.status(200).json({ success: true, submittedLabels: updatedLabels });
});
