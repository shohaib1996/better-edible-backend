import { Mold } from "../models/Mold";
import { DehydratorTray } from "../models/DehydratorTray";
import { DehydratorUnit } from "../models/DehydratorUnit";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// ─────────────────────────────────────────────────────────
// getMolds
// GET /api/pps/molds
// ─────────────────────────────────────────────────────────

export const getMolds = asyncHandler(async (_req, res) => {
  const molds = await Mold.find().sort({ moldId: 1 });
  res.json({ molds });
});

// ─────────────────────────────────────────────────────────
// getDehydratorTrays
// GET /api/pps/dehydrator-trays
// ─────────────────────────────────────────────────────────

export const getDehydratorTrays = asyncHandler(async (_req, res) => {
  const trays = await DehydratorTray.find().sort({ trayId: 1 });
  res.json({ trays });
});

// ─────────────────────────────────────────────────────────
// getDehydratorUnits
// GET /api/pps/dehydrator-units
// ─────────────────────────────────────────────────────────

export const getDehydratorUnits = asyncHandler(async (_req, res) => {
  const units = await DehydratorUnit.find().sort({ unitId: 1 });
  res.json({ units });
});

// ─────────────────────────────────────────────────────────
// bulkCreateMolds
// POST /api/pps/molds/bulk
// ─────────────────────────────────────────────────────────

export const bulkCreateMolds = asyncHandler(async (req, res) => {
  const { startNumber, endNumber, prefix = "MOLD", unitsPerMold = 104 } = req.body;

  if (startNumber == null || endNumber == null) {
    throw new AppError("startNumber and endNumber are required", 400);
  }
  if (startNumber > endNumber) {
    throw new AppError("startNumber must be <= endNumber", 400);
  }
  if (endNumber - startNumber + 1 > 200) {
    throw new AppError("Cannot create more than 200 molds at once", 400);
  }

  const docs = [];
  for (let i = startNumber; i <= endNumber; i++) {
    const moldId = `${prefix}${String(i).padStart(3, "0")}`;
    docs.push({ moldId, barcodeValue: moldId, unitsPerMold, status: "available" });
  }

  let created: number;
  let skipped: number;

  try {
    const result = await Mold.insertMany(docs, { ordered: false });
    created = result.length;
    skipped = docs.length - created;
  } catch (err: any) {
    if (err.insertedDocs) {
      created = err.insertedDocs.length;
      skipped = docs.length - created;
    } else {
      throw err;
    }
  }

  res.status(201).json({
    success: true,
    message: `${created!} molds created, ${skipped!} skipped (duplicates)`,
    created: created!,
    skipped: skipped!,
  });
});

// ─────────────────────────────────────────────────────────
// bulkCreateTrays
// POST /api/pps/dehydrator-trays/bulk
// ─────────────────────────────────────────────────────────

export const bulkCreateTrays = asyncHandler(async (req, res) => {
  const { startNumber, endNumber, prefix = "TRAY" } = req.body;

  if (startNumber == null || endNumber == null) {
    throw new AppError("startNumber and endNumber are required", 400);
  }
  if (startNumber > endNumber) {
    throw new AppError("startNumber must be <= endNumber", 400);
  }
  if (endNumber - startNumber + 1 > 200) {
    throw new AppError("Cannot create more than 200 trays at once", 400);
  }

  const docs = [];
  for (let i = startNumber; i <= endNumber; i++) {
    const trayId = `${prefix}${String(i).padStart(3, "0")}`;
    docs.push({ trayId, qrCodeValue: trayId, status: "available" });
  }

  let created: number;
  let skipped: number;

  try {
    const result = await DehydratorTray.insertMany(docs, { ordered: false });
    created = result.length;
    skipped = docs.length - created;
  } catch (err: any) {
    if (err.insertedDocs) {
      created = err.insertedDocs.length;
      skipped = docs.length - created;
    } else {
      throw err;
    }
  }

  res.status(201).json({
    success: true,
    message: `${created!} trays created, ${skipped!} skipped (duplicates)`,
    created: created!,
    skipped: skipped!,
  });
});

// ─────────────────────────────────────────────────────────
// bulkCreateDehydratorUnits
// POST /api/pps/dehydrator-units/bulk
// ─────────────────────────────────────────────────────────

export const bulkCreateDehydratorUnits = asyncHandler(async (req, res) => {
  const { startNumber, endNumber, prefix = "UNIT", totalShelves = 20 } = req.body;

  if (startNumber == null || endNumber == null) {
    throw new AppError("startNumber and endNumber are required", 400);
  }
  if (startNumber > endNumber) {
    throw new AppError("startNumber must be <= endNumber", 400);
  }
  if (endNumber - startNumber + 1 > 10) {
    throw new AppError("Cannot create more than 10 dehydrators at once", 400);
  }

  const results = [];
  const skipped = [];

  for (let i = startNumber; i <= endNumber; i++) {
    const unitId = `${prefix}-${i}`;
    const existing = await DehydratorUnit.findOne({ unitId });
    if (existing) {
      skipped.push(unitId);
      continue;
    }
    const unit = new DehydratorUnit({ unitId, totalShelves });
    await unit.save();
    results.push(unit);
  }

  res.status(201).json({
    success: true,
    message: `${results.length} units created, ${skipped.length} skipped (duplicates)`,
    created: results.length,
    skipped: skipped.length,
    units: results,
  });
});

// ─────────────────────────────────────────────────────────
// bulkDeleteMolds
// DELETE /api/pps/molds/bulk
// ─────────────────────────────────────────────────────────

export const bulkDeleteMolds = asyncHandler(async (req, res) => {
  const { moldIds } = req.body as { moldIds: string[] };

  const molds = await Mold.find({ moldId: { $in: moldIds } });
  const foundIds = molds.map((m) => m.moldId);
  const missingIds = moldIds.filter((id) => !foundIds.includes(id));
  if (missingIds.length > 0) {
    throw new AppError(`Some mold IDs not found: ${missingIds.join(", ")}`, 404);
  }

  const inUseIds = molds.filter((m) => m.status === "in-use").map((m) => m.moldId);
  if (inUseIds.length > 0) {
    throw new AppError(`Cannot delete in-use molds: ${inUseIds.join(", ")}`, 400);
  }

  await Mold.deleteMany({ moldId: { $in: moldIds } });

  res.json({
    success: true,
    deleted: moldIds.length,
    message: `${moldIds.length} mold${moldIds.length !== 1 ? "s" : ""} deleted`,
  });
});

// ─────────────────────────────────────────────────────────
// updateMoldStatus
// PATCH /api/pps/molds/:moldId/status
// ─────────────────────────────────────────────────────────

export const updateMoldStatus = asyncHandler(async (req, res) => {
  const { moldId } = req.params;
  const { status } = req.body as { status: "available" | "in-use" };

  if (status === "in-use") {
    throw new AppError("Cannot manually set a mold to in-use", 400);
  }

  const mold = await Mold.findOne({ moldId });
  if (!mold) throw new AppError("Mold not found", 404);

  mold.status = "available";
  mold.currentCookItemId = null;
  mold.lastUsedAt = new Date();
  await mold.save();

  res.json({ success: true, mold });
});

// ─────────────────────────────────────────────────────────
// bulkDeleteTrays
// DELETE /api/pps/dehydrator-trays/bulk
// ─────────────────────────────────────────────────────────

export const bulkDeleteTrays = asyncHandler(async (req, res) => {
  const { trayIds } = req.body as { trayIds: string[] };

  const trays = await DehydratorTray.find({ trayId: { $in: trayIds } });
  const foundIds = trays.map((t) => t.trayId);
  const missingIds = trayIds.filter((id) => !foundIds.includes(id));
  if (missingIds.length > 0) {
    throw new AppError(`Some tray IDs not found: ${missingIds.join(", ")}`, 404);
  }

  const inUseIds = trays.filter((t) => t.status === "in-use").map((t) => t.trayId);
  if (inUseIds.length > 0) {
    throw new AppError(`Cannot delete in-use trays: ${inUseIds.join(", ")}`, 400);
  }

  await DehydratorTray.deleteMany({ trayId: { $in: trayIds } });

  res.json({
    success: true,
    deleted: trayIds.length,
    message: `${trayIds.length} tray${trayIds.length !== 1 ? "s" : ""} deleted`,
  });
});

// ─────────────────────────────────────────────────────────
// updateTrayStatus
// PATCH /api/pps/dehydrator-trays/:trayId/status
// ─────────────────────────────────────────────────────────

export const updateTrayStatus = asyncHandler(async (req, res) => {
  const { trayId } = req.params;
  const { status } = req.body as { status: "available" | "in-use" };

  if (status === "in-use") {
    throw new AppError("Cannot manually set a tray to in-use", 400);
  }

  const tray = await DehydratorTray.findOne({ trayId });
  if (!tray) throw new AppError("Tray not found", 404);

  tray.status = "available";
  tray.currentCookItemId = null;
  tray.currentDehydratorUnitId = null;
  tray.currentShelfPosition = null;
  tray.lastUsedAt = new Date();
  await tray.save();

  res.json({ success: true, tray });
});
