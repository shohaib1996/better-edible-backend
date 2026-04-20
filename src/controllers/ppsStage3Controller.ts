import { Types } from "mongoose";
import { CookItem, ICookItem } from "../models/CookItem";
import { DehydratorTray } from "../models/DehydratorTray";
import { DehydratorUnit, IDehydratorUnit } from "../models/DehydratorUnit";
import { ClientOrder } from "../models/ClientOrder";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { extractPerformedBy } from "./ppsHelpers";

// ─────────────────────────────────────────────────────────
// getStage3CookItems
// GET /api/pps/stage-3/cook-items
// ─────────────────────────────────────────────────────────

export const getStage3CookItems = asyncHandler(async (_req, res) => {
  const rawItems = await CookItem.find({
    status: { $in: ["dehydrating_complete", "demolding_complete", "bagging", "sealing"] },
  })
    .sort({ createdAt: 1 })
    .lean();

  const now = Date.now();

  const cookItems = rawItems.map((item) => {
    const molds = item.dehydratorAssignments.map((assignment) => {
      const endTime = new Date(assignment.expectedEndTime).getTime();
      const isReady = now >= endTime;
      const diff = endTime - now;

      let timeRemaining = "00:00:00";
      if (!isReady && diff > 0) {
        const totalSecs = Math.floor(diff / 1000);
        const hh = String(Math.floor(totalSecs / 3600)).padStart(2, "0");
        const mm = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, "0");
        const ss = String(totalSecs % 60).padStart(2, "0");
        timeRemaining = `${hh}:${mm}:${ss}`;
      }

      return {
        moldId: assignment.moldId,
        trayId: assignment.trayId,
        dehydratorUnitId: assignment.dehydratorUnitId,
        shelfPosition: assignment.shelfPosition,
        dehydrationEndTime: assignment.expectedEndTime,
        isReady,
        timeRemaining,
      };
    });

    return { ...item, molds, allMoldsReady: molds.every((m) => m.isReady) };
  });

  res.json({ cookItems });
});

// ─────────────────────────────────────────────────────────
// removeTray
// POST /api/pps/stage-3/remove-tray
// ─────────────────────────────────────────────────────────

export const removeTray = asyncHandler(async (req, res) => {
  const { cookItemId, trayId } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId || !trayId) throw new AppError("cookItemId and trayId are required", 400);

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (cookItem.status !== "dehydrating_complete") {
    throw new AppError(
      `Cook item status is "${cookItem.status}", must be dehydrating_complete`,
      400
    );
  }

  const tray = await DehydratorTray.findOne({ trayId });
  if (!tray) throw new AppError("Dehydrator tray not found", 404);
  if (tray.status !== "in-use" || tray.currentCookItemId !== cookItemId) {
    throw new AppError("Tray is not assigned to this cook item", 400);
  }

  const removalTimestamp = new Date();
  cookItem.trayRemovalTimestamps.push({ trayId, removalTimestamp });

  cookItem.history.push({
    action: "tray_removed",
    performedBy,
    detail: `Tray ${trayId} removed`,
    timestamp: removalTimestamp,
  });

  await cookItem.save();

  res.json({ success: true, timestamp: removalTimestamp });
});

// ─────────────────────────────────────────────────────────
// completeStage3
// POST /api/pps/stage-3/complete
// ─────────────────────────────────────────────────────────

export const completeStage3 = asyncHandler(async (req, res) => {
  const { cookItemId } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId) throw new AppError("cookItemId is required", 400);

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (cookItem.status !== "dehydrating_complete") {
    throw new AppError(
      `Cook item status is "${cookItem.status}", must be dehydrating_complete`,
      400
    );
  }

  const now = new Date();

  const existingRemovedTrayIds = new Set(cookItem.trayRemovalTimestamps.map((t) => t.trayId));
  for (const assignment of cookItem.dehydratorAssignments) {
    if (!existingRemovedTrayIds.has(assignment.trayId)) {
      cookItem.trayRemovalTimestamps.push({
        trayId: assignment.trayId,
        removalTimestamp: now,
      });
    }
  }
  cookItem.containerPackedTimestamp = now;
  cookItem.labelPrintTimestamp = now;
  cookItem.demoldingCompletionTimestamp = now;
  cookItem.status = "demolding_complete";
  cookItem.history.push({ action: "stage_3_complete", performedBy, timestamp: now });

  await ClientOrder.findByIdAndUpdate(cookItem.privateLabOrderId, { status: "demolding" });

  const unitMap = new Map<string, IDehydratorUnit>();
  const releasedTrays: string[] = [];
  const releasedShelves: { dehydratorUnitId: string; shelfPosition: number }[] = [];

  for (const assignment of cookItem.dehydratorAssignments) {
    const tray = await DehydratorTray.findOne({ trayId: assignment.trayId });
    if (tray) {
      tray.status = "available";
      tray.currentCookItemId = null;
      tray.currentDehydratorUnitId = null;
      tray.currentShelfPosition = null;
      tray.lastUsedAt = now;
      await tray.save();
      releasedTrays.push(assignment.trayId);
    }

    if (!unitMap.has(assignment.dehydratorUnitId)) {
      const unit = await DehydratorUnit.findOne({ unitId: assignment.dehydratorUnitId });
      if (unit) unitMap.set(assignment.dehydratorUnitId, unit as any);
    }
    const unit = unitMap.get(assignment.dehydratorUnitId);
    if (unit) {
      (unit as any).shelves.set(String(assignment.shelfPosition), {
        occupied: false,
        trayId: null,
        cookItemId: null,
      });
      (unit as any).markModified("shelves");
      releasedShelves.push({
        dehydratorUnitId: assignment.dehydratorUnitId,
        shelfPosition: assignment.shelfPosition,
      });
    }
  }

  for (const unit of unitMap.values()) {
    await (unit as any).save();
  }

  await cookItem.save();

  res.json({ success: true, cookItem, releasedTrays, releasedShelves });
});

// ─────────────────────────────────────────────────────────
// startBagging
// POST /api/pps/stage-3/start-bagging
// ─────────────────────────────────────────────────────────

export const startBagging = asyncHandler(async (req, res) => {
  const { cookItemId } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId) throw new AppError("cookItemId is required", 400);

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (cookItem.status !== "demolding_complete") {
    throw new AppError(`Cook item status is "${cookItem.status}", must be demolding_complete`, 400);
  }

  const now = new Date();
  cookItem.status = "bagging";
  cookItem.baggingStartTimestamp = now;
  cookItem.history.push({ action: "bagging_started", performedBy, timestamp: now });
  await cookItem.save();

  res.json({ success: true, cookItem });
});

// ─────────────────────────────────────────────────────────
// startSealing
// POST /api/pps/stage-3/start-sealing
// ─────────────────────────────────────────────────────────

export const startSealing = asyncHandler(async (req, res) => {
  const { cookItemId } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId) throw new AppError("cookItemId is required", 400);

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (cookItem.status !== "bagging") {
    throw new AppError(`Cook item status is "${cookItem.status}", must be bagging`, 400);
  }

  const now = new Date();
  cookItem.status = "sealing";
  cookItem.sealingStartTimestamp = now;
  cookItem.history.push({ action: "sealing_started", performedBy, timestamp: now });
  await cookItem.save();

  res.json({ success: true, cookItem });
});

// ─────────────────────────────────────────────────────────
// completeBagSeal
// POST /api/pps/stage-3/bag-seal-complete
// ─────────────────────────────────────────────────────────

export const completeBagSeal = asyncHandler(async (req, res) => {
  const { cookItemId } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId) throw new AppError("cookItemId is required", 400);

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (cookItem.status !== "sealing") {
    throw new AppError(`Cook item status is "${cookItem.status}", must be sealing`, 400);
  }

  const now = new Date();
  cookItem.status = "bag_seal_complete";
  cookItem.history.push({ action: "bag_seal_complete", performedBy, timestamp: now });
  await cookItem.save();

  res.json({ success: true, cookItem });
});
