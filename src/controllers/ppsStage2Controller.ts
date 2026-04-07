import { CookItem } from "../models/CookItem";
import { Mold } from "../models/Mold";
import { DehydratorTray } from "../models/DehydratorTray";
import { DehydratorUnit } from "../models/DehydratorUnit";
import { ClientOrder } from "../models/ClientOrder";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { extractPerformedBy } from "./ppsHelpers";

// ─────────────────────────────────────────────────────────
// getStage2CookItems
// GET /api/pps/stage-2/cook-items
// ─────────────────────────────────────────────────────────

export const getStage2CookItems = asyncHandler(async (_req, res) => {
  const cookItems = await CookItem.find({ status: "cooking_molding_complete" })
    .sort({ createdAt: 1 })
    .lean();

  res.json({ cookItems });
});

// ─────────────────────────────────────────────────────────
// processMold
// POST /api/pps/stage-2/process-mold
// ─────────────────────────────────────────────────────────

export const processMold = asyncHandler(async (req, res) => {
  const { cookItemId, moldId, trayId, dehydratorUnitId, shelfPosition } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId || !moldId || !trayId || !dehydratorUnitId || shelfPosition == null) {
    throw new AppError(
      "cookItemId, moldId, trayId, dehydratorUnitId, and shelfPosition are required",
      400,
    );
  }

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (!["cooking_molding_complete", "dehydrating_complete"].includes(cookItem.status)) {
    throw new AppError(
      `Cook item status is "${cookItem.status}", must be cooking_molding_complete or dehydrating_complete`,
      400,
    );
  }

  const mold = await Mold.findOne({ moldId });
  if (!mold) throw new AppError("Mold not found", 404);
  if (mold.status !== "in-use" || mold.currentCookItemId !== cookItemId) {
    throw new AppError("Mold is not assigned to this cook item", 400);
  }

  const tray = await DehydratorTray.findOne({ trayId });
  if (!tray) throw new AppError("Dehydrator tray not found", 404);
  if (tray.status !== "available")
    throw new AppError("Dehydrator tray is not available", 400);

  const unit = await DehydratorUnit.findOne({ unitId: dehydratorUnitId });
  if (!unit) throw new AppError("Dehydrator unit not found", 404);

  const shelf = unit.shelves.get(String(shelfPosition));
  if (!shelf)
    throw new AppError(`Shelf position ${shelfPosition} does not exist`, 400);
  if (shelf.occupied)
    throw new AppError(`Shelf ${shelfPosition} is already occupied`, 400);

  const now = new Date();
  const dehydrationEndTime = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  mold.status = "available";
  mold.currentCookItemId = null;
  mold.lastUsedAt = now;

  tray.status = "in-use";
  tray.currentCookItemId = cookItemId;
  tray.currentDehydratorUnitId = dehydratorUnitId;
  tray.currentShelfPosition = shelfPosition;

  unit.shelves.set(String(shelfPosition), { occupied: true, trayId, cookItemId });
  unit.markModified("shelves");

  cookItem.dehydratorTrayIds.push(trayId);
  cookItem.dehydratorAssignments.push({
    moldId,
    trayId,
    dehydratorUnitId,
    shelfPosition,
    loadTimestamp: now,
    expectedEndTime: dehydrationEndTime,
  });

  const processedMoldIds = cookItem.dehydratorAssignments.map((a) => a.moldId);
  const allProcessed = cookItem.assignedMoldIds.every((id) => processedMoldIds.includes(id));
  if (allProcessed) {
    cookItem.status = "dehydrating_complete";
    cookItem.dehydratingCompletionTimestamp = now;
    await ClientOrder.findByIdAndUpdate(cookItem.privateLabOrderId, { status: "dehydrating" });
  }

  cookItem.history.push({
    action: "mold_processed",
    performedBy,
    detail: `Mold ${moldId} → Tray ${trayId} on ${dehydratorUnitId} shelf ${shelfPosition}`,
    timestamp: now,
  });
  if (allProcessed) {
    cookItem.history.push({ action: "stage_2_complete", performedBy, timestamp: now });
  }

  await Promise.all([mold.save(), tray.save(), unit.save(), cookItem.save()]);

  res.json({
    success: true,
    message: allProcessed
      ? "All molds processed — cook item moved to dehydrating_complete"
      : "Mold processed successfully",
    mold,
    tray,
    dehydrationEndTime,
    cookItem,
  });
});

// ─────────────────────────────────────────────────────────
// unprocessMold
// DELETE /api/pps/stage-2/unprocess-mold
// ─────────────────────────────────────────────────────────

export const unprocessMold = asyncHandler(async (req, res) => {
  const { cookItemId, moldId } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId || !moldId) {
    throw new AppError("cookItemId and moldId are required", 400);
  }

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (!["cooking_molding_complete", "dehydrating_complete"].includes(cookItem.status)) {
    throw new AppError(
      `Cook item status is "${cookItem.status}", cannot unprocess mold`,
      400,
    );
  }

  const assignment = cookItem.dehydratorAssignments.find((a) => a.moldId === moldId);
  if (!assignment) throw new AppError("Mold assignment not found for this cook item", 404);

  const { trayId, dehydratorUnitId, shelfPosition } = assignment;

  const tray = await DehydratorTray.findOne({ trayId });
  if (tray) {
    tray.status = "available";
    tray.currentCookItemId = null;
    tray.currentDehydratorUnitId = null;
    tray.currentShelfPosition = null;
    tray.lastUsedAt = new Date();
    await tray.save();
  }

  const unit = await DehydratorUnit.findOne({ unitId: dehydratorUnitId });
  if (unit) {
    unit.shelves.set(String(shelfPosition), { occupied: false, trayId: null, cookItemId: null });
    await unit.save();
  }

  await Mold.findOneAndUpdate(
    { moldId },
    { status: "in-use", currentCookItemId: cookItemId },
  );

  cookItem.dehydratorAssignments = cookItem.dehydratorAssignments.filter(
    (a) => a.moldId !== moldId,
  );

  if (cookItem.status === "dehydrating_complete") {
    cookItem.status = "cooking_molding_complete";
    cookItem.dehydratingCompletionTimestamp = undefined;
  }

  cookItem.history.push({
    action: "mold_unprocessed",
    performedBy,
    detail: `Tray ${trayId} removed from ${dehydratorUnitId} shelf ${shelfPosition}`,
    timestamp: new Date(),
  });

  await cookItem.save();

  res.json({ success: true, cookItem, tray, assignment });
});

// ─────────────────────────────────────────────────────────
// getNextAvailableShelf
// GET /api/pps/stage-2/next-available-shelf
// ─────────────────────────────────────────────────────────

export const getNextAvailableShelf = asyncHandler(async (_req, res) => {
  const units = await DehydratorUnit.find();
  units.sort((a, b) => {
    const numA = parseInt(a.unitId.replace(/\D/g, ""), 10);
    const numB = parseInt(b.unitId.replace(/\D/g, ""), 10);
    return numA - numB;
  });

  for (const unit of units) {
    for (let i = 1; i <= unit.totalShelves; i++) {
      const shelf = unit.shelves.get(String(i));
      if (shelf && !shelf.occupied) {
        return res.json({ dehydratorUnitId: unit.unitId, shelfPosition: i });
      }
    }
  }

  throw new AppError("No available shelves", 404);
});
