import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { Label } from "../models/Label";
import { PrivateLabelClient } from "../models/PrivateLabelClient";
import { GummyPool } from "../models/GummyPool";
import { calculateGummyPrice, buildCannabinoidKey } from "../utils/gummyPricing";
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
// GET /api/store/labels?storeId=
// -------------------
export const getMyLabels = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) throw new AppError("storeId is required", 400);

  const client = await PrivateLabelClient.findOne({ store: new Types.ObjectId(storeId as string) });
  if (!client) {
    return res.status(200).json({ success: true, labels: [], clientStatus: null });
  }

  const labels = await Label.find({ client: client._id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    labels,
    clientStatus: client.status,
    clientId: client._id,
  });
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

  // Update logo
  if (logoStatus) {
    client.logo = { url: logoUrl || undefined, status: logoStatus };
    await client.save();
  }

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
