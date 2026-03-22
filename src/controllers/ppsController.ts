import { Types } from "mongoose";
import { CookItem, ICookItem, IHistoryEntry } from "../models/CookItem";
import { Mold } from "../models/Mold";
import { DehydratorTray } from "../models/DehydratorTray";
import { DehydratorUnit, IDehydratorUnit } from "../models/DehydratorUnit";
import { Case } from "../models/Case";
import { ClientOrder } from "../models/ClientOrder";
import { Label } from "../models/Label";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// ─────────────────────────────────────────────────────────
// HELPER: Extract Performed By
// ─────────────────────────────────────────────────────────

function extractPerformedBy(body: any): IHistoryEntry["performedBy"] {
  const p = body?.performedBy;
  return {
    userId: p?.userId || "unknown",
    userName: p?.userName || "Unknown",
    repType: p?.repType || "unknown",
  };
}

// ─────────────────────────────────────────────────────────
// ENDPOINT 1: bulkCreateCookItems
// POST /api/pps/cook-items/bulk
// ─────────────────────────────────────────────────────────

export const bulkCreateCookItems = asyncHandler(async (req, res) => {
  const { orderId, orderNumber, customerId, items } = req.body;

  if (
    !orderId ||
    !orderNumber ||
    !customerId ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new AppError(
      "orderId, orderNumber, customerId, and a non-empty items array are required",
      400,
    );
  }

  // Load the order with client → store to get storeId
  const order = (await ClientOrder.findById(orderId)
    .populate({
      path: "client",
      populate: { path: "store", select: "storeId" },
    })
    .lean()) as any;

  if (!order) throw new AppError("Order not found", 404);

  const storeId: string | undefined = order.client?.store?.storeId;
  if (!storeId)
    throw new AppError("Store storeId missing — run backfill script", 400);

  // Normalise orderNumber: remove dash (PL-10154 → PL10154)
  const normalizedOrderNumber = (order.orderNumber as string).replace("-", "");

  const cookItemDocs = await Promise.all(
    items.map(async (item: any) => {
      // Look up label to get its itemId (e.g. B003)
      const label = (await Label.findById(item.labelId)
        .select("itemId")
        .lean()) as any;
      if (!label?.itemId)
        throw new AppError(
          `Label itemId missing for label ${item.labelId}`,
          400,
        );

      const cookItemId = `${storeId}${normalizedOrderNumber}${label.itemId}`;

      return {
        cookItemId,
        customerId,
        orderId: order.orderNumber,
        itemId: item.labelId,
        labelId: item.labelId,
        privateLabOrderId: orderId,
        storeName: item.storeName,
        flavor: item.flavor,
        quantity: item.quantity,
        flavorComponents: item.flavorComponents || [],
        colorComponents: item.colorComponents || [],
        productType: item.productType,
        specialFormulation: false,
        status: "pending",
        expectedCount: item.quantity,
      };
    }),
  );

  const cookItems = await CookItem.insertMany(cookItemDocs);

  res.status(201).json({
    success: true,
    message: `${cookItems.length} cook items created`,
    cookItems,
  });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 2: getStage1CookItems
// GET /api/pps/stage-1/cook-items
// ─────────────────────────────────────────────────────────

export const getStage1CookItems = asyncHandler(async (req, res) => {
  const { status = "pending,in-progress", page = 1, limit = 20 } = req.query;

  const statusArray = String(status)
    .split(",")
    .map((s) => s.trim());
  const skip = (Number(page) - 1) * Number(limit);

  const [cookItems, total] = await Promise.all([
    CookItem.find({ status: { $in: statusArray } })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    CookItem.countDocuments({ status: { $in: statusArray } }),
  ]);

  res.json({ total, page: Number(page), limit: Number(limit), cookItems });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 3: assignMold
// POST /api/pps/stage-1/assign-mold
// ─────────────────────────────────────────────────────────

export const assignMold = asyncHandler(async (req, res) => {
  const { cookItemId, moldId } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId || !moldId) {
    throw new AppError("cookItemId and moldId are required", 400);
  }

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (!["pending", "in-progress"].includes(cookItem.status)) {
    throw new AppError(
      `Cook item status is "${cookItem.status}", must be pending or in-progress`,
      400,
    );
  }

  // Atomic update to prevent race conditions — only succeeds if still "available"
  const mold = await Mold.findOneAndUpdate(
    { moldId, status: "available" },
    { status: "in-use", currentCookItemId: cookItemId },
    { new: true },
  );

  if (!mold) throw new AppError("Mold not found or already in use", 400);

  // Update cook item
  const now = new Date();
  cookItem.assignedMoldIds.push(moldId);
  cookItem.moldingTimestamps.push({ moldId, startTimestamp: now });

  if (cookItem.status === "pending") {
    cookItem.status = "in-progress";
    cookItem.cookingMoldingStartTimestamp = now;
  }

  cookItem.history.push({
    action: "mold_assigned",
    performedBy,
    detail: `Mold ${moldId} assigned`,
    timestamp: now,
  });

  await cookItem.save();

  res.json({ success: true, cookItem, mold });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 4: completeStage1
// PATCH /api/pps/stage-1/complete
// ─────────────────────────────────────────────────────────

export const completeStage1 = asyncHandler(async (req, res) => {
  const { cookItemId } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId) throw new AppError("cookItemId is required", 400);

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (cookItem.status !== "in-progress") {
    throw new AppError(
      `Cook item status is "${cookItem.status}", must be in-progress`,
      400,
    );
  }
  if (!cookItem.assignedMoldIds || cookItem.assignedMoldIds.length === 0) {
    throw new AppError("No molds assigned to this cook item", 400);
  }

  const now = new Date();
  cookItem.cookingMoldingCompletionTimestamp = now;

  // Close out all open molding timestamps
  cookItem.moldingTimestamps = cookItem.moldingTimestamps.map((entry) => ({
    ...entry,
    completionTimestamp: entry.completionTimestamp ?? now,
  }));

  cookItem.status = "cooking_molding_complete";

  cookItem.history.push({
    action: "stage_1_complete",
    performedBy,
    timestamp: now,
  });

  await cookItem.save();

  res.json({ success: true, cookItem });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 5: getStage2CookItems
// GET /api/pps/stage-2/cook-items
// ─────────────────────────────────────────────────────────

export const getStage2CookItems = asyncHandler(async (_req, res) => {
  const cookItems = await CookItem.find({ status: "cooking_molding_complete" })
    .sort({ createdAt: 1 })
    .lean();

  res.json({ cookItems });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 6: processMold
// POST /api/pps/stage-2/process-mold
// ─────────────────────────────────────────────────────────

export const processMold = asyncHandler(async (req, res) => {
  const { cookItemId, moldId, trayId, dehydratorUnitId, shelfPosition } =
    req.body;
  const performedBy = extractPerformedBy(req.body);

  if (
    !cookItemId ||
    !moldId ||
    !trayId ||
    !dehydratorUnitId ||
    shelfPosition == null
  ) {
    throw new AppError(
      "cookItemId, moldId, trayId, dehydratorUnitId, and shelfPosition are required",
      400,
    );
  }

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (
    !["cooking_molding_complete", "dehydrating_complete"].includes(
      cookItem.status,
    )
  ) {
    throw new AppError(
      `Cook item status is "${cookItem.status}", must be cooking_molding_complete or dehydrating_complete`,
      400,
    );
  }

  // Validate mold is in-use for this cook item
  const mold = await Mold.findOne({ moldId });
  if (!mold) throw new AppError("Mold not found", 404);
  if (mold.status !== "in-use" || mold.currentCookItemId !== cookItemId) {
    throw new AppError("Mold is not assigned to this cook item", 400);
  }

  // Validate tray is available
  const tray = await DehydratorTray.findOne({ trayId });
  if (!tray) throw new AppError("Dehydrator tray not found", 404);
  if (tray.status !== "available")
    throw new AppError("Dehydrator tray is not available", 400);

  // Validate shelf is free
  const unit = await DehydratorUnit.findOne({ unitId: dehydratorUnitId });
  if (!unit) throw new AppError("Dehydrator unit not found", 404);

  const shelf = unit.shelves.get(String(shelfPosition));
  if (!shelf)
    throw new AppError(`Shelf position ${shelfPosition} does not exist`, 400);
  if (shelf.occupied)
    throw new AppError(`Shelf ${shelfPosition} is already occupied`, 400);

  const now = new Date();
  const dehydrationEndTime = new Date(now.getTime() + 2 * 60 * 1000); // TODO: change to 12 * 60 * 60 * 1000 for production (12 hours)

  // Release mold
  mold.status = "available";
  mold.currentCookItemId = null;
  mold.lastUsedAt = now;

  // Assign tray
  tray.status = "in-use";
  tray.currentCookItemId = cookItemId;
  tray.currentDehydratorUnitId = dehydratorUnitId;
  tray.currentShelfPosition = shelfPosition;

  // Occupy shelf
  unit.shelves.set(String(shelfPosition), {
    occupied: true,
    trayId,
    cookItemId,
  });
  unit.markModified("shelves");

  // Update cook item
  cookItem.dehydratorTrayIds.push(trayId);
  cookItem.dehydratorAssignments.push({
    moldId,
    trayId,
    dehydratorUnitId,
    shelfPosition,
    loadTimestamp: now,
    expectedEndTime: dehydrationEndTime,
  });

  // Auto-complete Stage 2 if all molds have been processed
  const processedMoldIds = cookItem.dehydratorAssignments.map((a) => a.moldId);
  const allProcessed = cookItem.assignedMoldIds.every((id) =>
    processedMoldIds.includes(id),
  );
  if (allProcessed) {
    cookItem.status = "dehydrating_complete";
    cookItem.dehydratingCompletionTimestamp = now;
    await ClientOrder.findByIdAndUpdate(cookItem.privateLabOrderId, {
      status: "dehydrating",
    });
  }

  cookItem.history.push({
    action: "mold_processed",
    performedBy,
    detail: `Mold ${moldId} → Tray ${trayId} on ${dehydratorUnitId} shelf ${shelfPosition}`,
    timestamp: now,
  });
  if (allProcessed) {
    cookItem.history.push({
      action: "stage_2_complete",
      performedBy,
      timestamp: now,
    });
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
// ENDPOINT 7: getNextAvailableShelf
// GET /api/pps/stage-2/next-available-shelf
// ─────────────────────────────────────────────────────────

export const getNextAvailableShelf = asyncHandler(async (_req, res) => {
  const units = await DehydratorUnit.find().sort({ unitId: 1 });

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

// ─────────────────────────────────────────────────────────
// ENDPOINT 8: getMolds
// GET /api/pps/molds
// ─────────────────────────────────────────────────────────

export const getMolds = asyncHandler(async (_req, res) => {
  const molds = await Mold.find().sort({ moldId: 1 });
  res.json({ molds });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 9: getDehydratorTrays
// GET /api/pps/dehydrator-trays
// ─────────────────────────────────────────────────────────

export const getDehydratorTrays = asyncHandler(async (_req, res) => {
  const trays = await DehydratorTray.find().sort({ trayId: 1 });
  res.json({ trays });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 10: getDehydratorUnits
// GET /api/pps/dehydrator-units
// ─────────────────────────────────────────────────────────

export const getDehydratorUnits = asyncHandler(async (_req, res) => {
  const units = await DehydratorUnit.find().sort({ unitId: 1 });
  res.json({ units });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 11: bulkCreateMolds
// POST /api/pps/molds/bulk
// ─────────────────────────────────────────────────────────

export const bulkCreateMolds = asyncHandler(async (req, res) => {
  const {
    startNumber,
    endNumber,
    prefix = "MOLD",
    unitsPerMold = 104,
  } = req.body;

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
    docs.push({
      moldId,
      barcodeValue: moldId,
      unitsPerMold,
      status: "available",
    });
  }

  let created = 0;
  let skipped = 0;

  try {
    const result = await Mold.insertMany(docs, { ordered: false });
    created = result.length;
    skipped = docs.length - created;
  } catch (err: any) {
    // Partial insert — some duplicates skipped
    if (err.insertedDocs) {
      created = err.insertedDocs.length;
      skipped = docs.length - created;
    } else {
      throw err;
    }
  }

  res.status(201).json({
    success: true,
    message: `${created} molds created, ${skipped} skipped (duplicates)`,
    created,
    skipped,
  });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 12: bulkCreateTrays
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

  let created = 0;
  let skipped = 0;

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
    message: `${created} trays created, ${skipped} skipped (duplicates)`,
    created,
    skipped,
  });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 13: bulkCreateDehydratorUnits
// POST /api/pps/dehydrator-units/bulk
// ─────────────────────────────────────────────────────────

export const bulkCreateDehydratorUnits = asyncHandler(async (req, res) => {
  const { startNumber, endNumber, prefix = "UNIT" } = req.body;

  if (startNumber == null || endNumber == null) {
    throw new AppError("startNumber and endNumber are required", 400);
  }
  if (startNumber > endNumber) {
    throw new AppError("startNumber must be <= endNumber", 400);
  }
  if (endNumber - startNumber + 1 > 20) {
    throw new AppError(
      "Cannot create more than 20 dehydrator units at once",
      400,
    );
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
    // Must use .save() to trigger pre-save hook that initializes 20 shelves
    const unit = new DehydratorUnit({ unitId, totalShelves: 20 });
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
// INTERNAL HELPER: formatTimestamp
// ─────────────────────────────────────────────────────────

function formatTimestamp(date: Date): string {
  const y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${y}${M}${d}${h}${m}${s}`;
}

// ─────────────────────────────────────────────────────────
// INTERNAL HELPER: completeProduction
// Called when all cook items for an order reach packaging_casing_complete
// Internal try/catch kept intentionally — this is fire-and-forget
// ─────────────────────────────────────────────────────────

async function completeProduction(
  privateLabOrderId: Types.ObjectId,
  _cookItems: ICookItem[],
) {
  const order = await ClientOrder.findById(privateLabOrderId).populate({
    path: "client",
    populate: { path: "store" },
  });

  if (!order) return;

  order.status = "ready_to_ship";
  await order.save();

  try {
    const { sendReadyToShipNotification } =
      await import("../jobs/clientOrderJobs");
    await sendReadyToShipNotification(order);
  } catch (err) {
    console.error("Error sending ready to ship notification:", err);
  }
}

// ─────────────────────────────────────────────────────────
// ENDPOINT 14: getStage3CookItems
// GET /api/pps/stage-3/cook-items
// ─────────────────────────────────────────────────────────

export const getStage3CookItems = asyncHandler(async (_req, res) => {
  const rawItems = await CookItem.find({ status: "dehydrating_complete" })
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

    return {
      ...item,
      molds,
      allMoldsReady: molds.every((m) => m.isReady),
    };
  });

  res.json({ cookItems });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 15: removeTray
// POST /api/pps/stage-3/remove-tray
// ─────────────────────────────────────────────────────────

export const removeTray = asyncHandler(async (req, res) => {
  const { cookItemId, trayId } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId || !trayId)
    throw new AppError("cookItemId and trayId are required", 400);

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (cookItem.status !== "dehydrating_complete") {
    throw new AppError(
      `Cook item status is "${cookItem.status}", must be dehydrating_complete`,
      400,
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
// ENDPOINT 16: completeStage3
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
      400,
    );
  }

  if (
    cookItem.trayRemovalTimestamps.length <
    cookItem.dehydratorAssignments.length
  ) {
    throw new AppError(
      `Not all trays have been scanned. Expected ${cookItem.dehydratorAssignments.length}, got ${cookItem.trayRemovalTimestamps.length}`,
      400,
    );
  }

  const now = new Date();
  cookItem.containerPackedTimestamp = now;
  cookItem.labelPrintTimestamp = now;
  cookItem.demoldingCompletionTimestamp = now;
  cookItem.status = "demolding_complete";
  cookItem.history.push({
    action: "stage_3_complete",
    performedBy,
    timestamp: now,
  });
  await ClientOrder.findByIdAndUpdate(cookItem.privateLabOrderId, {
    status: "demolding",
  });

  // Collect units to update (group assignments by dehydratorUnitId)
  const unitMap = new Map<string, IDehydratorUnit>();

  const releasedTrays: string[] = [];
  const releasedShelves: { dehydratorUnitId: string; shelfPosition: number }[] =
    [];

  for (const assignment of cookItem.dehydratorAssignments) {
    // Release tray
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

    // Release shelf — batch by unit
    if (!unitMap.has(assignment.dehydratorUnitId)) {
      const unit = await DehydratorUnit.findOne({
        unitId: assignment.dehydratorUnitId,
      });
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

  // Save all units
  for (const unit of unitMap.values()) {
    await (unit as any).save();
  }

  await cookItem.save();

  res.json({
    success: true,
    cookItem,
    releasedTrays,
    releasedShelves,
  });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 17: getStage4CookItems
// GET /api/pps/stage-4/cook-items
// ─────────────────────────────────────────────────────────

export const getStage4CookItems = asyncHandler(async (_req, res) => {
  const cookItems = await CookItem.find({ status: "demolding_complete" })
    .sort({ createdAt: 1 })
    .lean();

  res.json({ cookItems });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 18: scanContainer
// POST /api/pps/stage-4/scan-container
// ─────────────────────────────────────────────────────────

export const scanContainer = asyncHandler(async (req, res) => {
  const { qrCodeData } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!qrCodeData) throw new AppError("qrCodeData is required", 400);

  let cookItemId: string;
  if (typeof qrCodeData === "string") {
    // Accept either a raw cookItemId string or JSON containing cookItemId
    try {
      const parsed = JSON.parse(qrCodeData);
      cookItemId = parsed.cookItemId;
    } catch {
      // Not JSON — treat the raw string as the cookItemId directly
      cookItemId = qrCodeData.trim();
    }
  } else if (typeof qrCodeData === "object" && qrCodeData.cookItemId) {
    cookItemId = qrCodeData.cookItemId;
  } else {
    throw new AppError("Invalid qrCodeData", 400);
  }

  if (!cookItemId)
    throw new AppError("Could not extract cookItemId from qrCodeData", 400);

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (cookItem.status !== "demolding_complete") {
    throw new AppError(
      `Cook item status is "${cookItem.status}", must be demolding_complete`,
      400,
    );
  }

  const packagingStartTime = new Date();
  cookItem.packagingStartTimestamp = packagingStartTime;
  cookItem.history.push({
    action: "packaging_started",
    performedBy,
    timestamp: packagingStartTime,
  });
  await cookItem.save();

  res.json({
    success: true,
    cookItem: {
      cookItemId: cookItem.cookItemId,
      storeName: cookItem.storeName,
      flavor: cookItem.flavor,
      productType: cookItem.productType,
      expectedCount: cookItem.expectedCount,
      numberOfMolds: cookItem.assignedMoldIds.length,
    },
  });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 18: confirmCount
// POST /api/pps/stage-4/confirm-count
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// ENDPOINT 20: getCaseById
// GET /api/pps/cases/:caseId
// ─────────────────────────────────────────────────────────

export const getCaseById = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const caseDoc = await Case.findOne({ caseId }).lean();
  if (!caseDoc) throw new AppError("Case not found", 404);
  res.json({ success: true, case: caseDoc });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 21: getCookItemHistory
// GET /api/pps/cook-items/:cookItemId/history
// ─────────────────────────────────────────────────────────

export const getCookItemHistory = asyncHandler(async (req, res) => {
  const { cookItemId } = req.params;

  const cookItem = await CookItem.findOne({ cookItemId }).lean();
  if (!cookItem) throw new AppError("Cook item not found", 404);

  const history = (cookItem.history || []).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  res.json({ cookItemId, history });
});

// ─────────────────────────────────────────────────────────
// ENDPOINT 18: confirmCount
// POST /api/pps/stage-4/confirm-count
// ─────────────────────────────────────────────────────────

export const confirmCount = asyncHandler(async (req, res) => {
  const { cookItemId, actualCount } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId || actualCount == null) {
    throw new AppError("cookItemId and actualCount are required", 400);
  }

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (cookItem.status !== "demolding_complete") {
    throw new AppError(
      `Cook item status is "${cookItem.status}", must be demolding_complete`,
      400,
    );
  }

  const now = new Date();
  const timestamp = formatTimestamp(now);
  const shortCustomerId = String(cookItem.customerId).substring(0, 9);
  const cleanOrderId = cookItem.orderId.replace(/-/g, "");
  const labelId = cookItem.itemId;

  const countVariance = actualCount - cookItem.expectedCount;
  const fullCases = Math.floor(actualCount / 100);
  const partialCaseCount = actualCount % 100;
  const totalCases = fullCases + (partialCaseCount > 0 ? 1 : 0);

  const caseDocs = [];
  for (let i = 1; i <= totalCases; i++) {
    const unitCount = i <= fullCases ? 100 : partialCaseCount;
    const caseId = `CASE-${shortCustomerId}-${cleanOrderId}-${labelId}-${i}-${timestamp}`;
    caseDocs.push({
      caseId,
      cookItemId: cookItem.cookItemId,
      orderId: cookItem.orderId,
      customerId: cookItem.customerId,
      storeName: cookItem.storeName,
      flavor: cookItem.flavor,
      productType: cookItem.productType,
      unitCount,
      caseNumber: i,
      totalCasesForItem: totalCases,
      labelPrintTimestamp: now,
      status: "in-inventory",
    });
  }

  const createdCases = await Case.insertMany(caseDocs);

  cookItem.actualCount = actualCount;
  cookItem.countVariance = countVariance;
  cookItem.fullCases = fullCases;
  cookItem.partialCaseCount = partialCaseCount;
  cookItem.totalCases = totalCases;
  cookItem.caseIds = createdCases.map((c) => c.caseId);
  cookItem.packagingCompletionTimestamp = now;
  cookItem.status = "packaging_casing_complete";
  cookItem.history.push({
    action: "packaging_complete",
    performedBy,
    detail: `Actual: ${actualCount} → ${totalCases} case(s)`,
    timestamp: now,
  });
  await cookItem.save();

  // Check if all cook items for this order are complete
  const allItemsForOrder = await CookItem.find({ orderId: cookItem.orderId });
  const completedCount = allItemsForOrder.filter(
    (i) => i.status === "packaging_casing_complete",
  ).length;
  const allComplete = completedCount === allItemsForOrder.length;

  if (allComplete) {
    await completeProduction(cookItem.privateLabOrderId, allItemsForOrder);
  }

  res.json({
    success: true,
    cookItem,
    cases: createdCases.map((c) => ({
      caseId: c.caseId,
      unitCount: c.unitCount,
      caseNumber: c.caseNumber,
      labelData: {
        storeName: c.storeName,
        flavor: c.flavor,
        unitCount: c.unitCount,
        caseId: c.caseId,
        cookItemId: c.cookItemId,
      },
    })),
    orderStatus: {
      orderId: cookItem.orderId,
      isComplete: allComplete,
      completedItems: completedCount,
      totalItems: allItemsForOrder.length,
    },
  });
});
