import { Request, Response } from "express";
import { Types } from "mongoose";
import { CookItem, ICookItem } from "../models/CookItem";
import { Mold } from "../models/Mold";
import { DehydratorTray } from "../models/DehydratorTray";
import { DehydratorUnit, IDehydratorUnit } from "../models/DehydratorUnit";
import { Case } from "../models/Case";
import { ClientOrder } from "../models/ClientOrder";

// ─────────────────────────────────────────────────────────
// ENDPOINT 1: bulkCreateCookItems
// POST /api/pps/cook-items/bulk
// ─────────────────────────────────────────────────────────

export const bulkCreateCookItems = async (req: Request, res: Response) => {
  try {
    const { orderId, orderNumber, customerId, items } = req.body;

    if (!orderId || !orderNumber || !customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "orderId, orderNumber, customerId, and a non-empty items array are required" });
    }

    const cookItemDocs = items.map((item: any) => ({
      cookItemId: item.cookItemId,
      customerId,
      orderId: orderNumber,
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
    }));

    const cookItems = await CookItem.insertMany(cookItemDocs);

    res.status(201).json({
      success: true,
      message: `${cookItems.length} cook items created`,
      cookItems,
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating cook items", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 2: getStage1CookItems
// GET /api/pps/stage-1/cook-items
// ─────────────────────────────────────────────────────────

export const getStage1CookItems = async (req: Request, res: Response) => {
  try {
    const { status = "pending,in-progress", page = 1, limit = 20 } = req.query;

    const statusArray = String(status).split(",").map((s) => s.trim());
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
  } catch (error) {
    res.status(500).json({ message: "Error fetching Stage 1 cook items", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 3: assignMold
// POST /api/pps/stage-1/assign-mold
// ─────────────────────────────────────────────────────────

export const assignMold = async (req: Request, res: Response) => {
  try {
    const { cookItemId, moldId } = req.body;

    if (!cookItemId || !moldId) {
      return res.status(400).json({ message: "cookItemId and moldId are required" });
    }

    const cookItem = await CookItem.findOne({ cookItemId });
    if (!cookItem) {
      return res.status(404).json({ message: "Cook item not found" });
    }
    if (!["pending", "in-progress"].includes(cookItem.status)) {
      return res.status(400).json({ message: `Cook item status is "${cookItem.status}", must be pending or in-progress` });
    }

    // Atomic update to prevent race conditions — only succeeds if still "available"
    const mold = await Mold.findOneAndUpdate(
      { moldId, status: "available" },
      { status: "in-use", currentCookItemId: cookItemId },
      { new: true }
    );

    if (!mold) {
      return res.status(400).json({ message: "Mold not found or already in use" });
    }

    // Update cook item
    const now = new Date();
    cookItem.assignedMoldIds.push(moldId);
    cookItem.moldingTimestamps.push({ moldId, startTimestamp: now });

    if (cookItem.status === "pending") {
      cookItem.status = "in-progress";
      cookItem.cookingMoldingStartTimestamp = now;
    }

    await cookItem.save();

    res.json({ success: true, cookItem, mold });
  } catch (error) {
    res.status(500).json({ message: "Error assigning mold", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 4: completeStage1
// PATCH /api/pps/stage-1/complete
// ─────────────────────────────────────────────────────────

export const completeStage1 = async (req: Request, res: Response) => {
  try {
    const { cookItemId } = req.body;

    if (!cookItemId) {
      return res.status(400).json({ message: "cookItemId is required" });
    }

    const cookItem = await CookItem.findOne({ cookItemId });
    if (!cookItem) {
      return res.status(404).json({ message: "Cook item not found" });
    }
    if (cookItem.status !== "in-progress") {
      return res.status(400).json({ message: `Cook item status is "${cookItem.status}", must be in-progress` });
    }
    if (!cookItem.assignedMoldIds || cookItem.assignedMoldIds.length === 0) {
      return res.status(400).json({ message: "No molds assigned to this cook item" });
    }

    const now = new Date();
    cookItem.cookingMoldingCompletionTimestamp = now;

    // Close out all open molding timestamps
    cookItem.moldingTimestamps = cookItem.moldingTimestamps.map((entry) => ({
      ...entry,
      completionTimestamp: entry.completionTimestamp ?? now,
    }));

    cookItem.status = "cooking_molding_complete";
    await cookItem.save();

    res.json({ success: true, cookItem });
  } catch (error) {
    res.status(500).json({ message: "Error completing Stage 1", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 5: getStage2CookItems
// GET /api/pps/stage-2/cook-items
// ─────────────────────────────────────────────────────────

export const getStage2CookItems = async (req: Request, res: Response) => {
  try {
    const cookItems = await CookItem.find({ status: "cooking_molding_complete" })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ cookItems });
  } catch (error) {
    res.status(500).json({ message: "Error fetching Stage 2 cook items", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 6: processMold
// POST /api/pps/stage-2/process-mold
// ─────────────────────────────────────────────────────────

export const processMold = async (req: Request, res: Response) => {
  try {
    const { cookItemId, moldId, trayId, dehydratorUnitId, shelfPosition } = req.body;

    if (!cookItemId || !moldId || !trayId || !dehydratorUnitId || shelfPosition == null) {
      return res.status(400).json({ message: "cookItemId, moldId, trayId, dehydratorUnitId, and shelfPosition are required" });
    }

    const cookItem = await CookItem.findOne({ cookItemId });
    if (!cookItem) {
      return res.status(404).json({ message: "Cook item not found" });
    }
    if (!["cooking_molding_complete", "dehydrating_complete"].includes(cookItem.status)) {
      return res.status(400).json({ message: `Cook item status is "${cookItem.status}", must be cooking_molding_complete or dehydrating_complete` });
    }

    // Validate mold is in-use for this cook item
    const mold = await Mold.findOne({ moldId });
    if (!mold) return res.status(404).json({ message: "Mold not found" });
    if (mold.status !== "in-use" || mold.currentCookItemId !== cookItemId) {
      return res.status(400).json({ message: "Mold is not assigned to this cook item" });
    }

    // Validate tray is available
    const tray = await DehydratorTray.findOne({ trayId });
    if (!tray) return res.status(404).json({ message: "Dehydrator tray not found" });
    if (tray.status !== "available") {
      return res.status(400).json({ message: "Dehydrator tray is not available" });
    }

    // Validate shelf is free
    const unit = await DehydratorUnit.findOne({ unitId: dehydratorUnitId });
    if (!unit) return res.status(404).json({ message: "Dehydrator unit not found" });

    const shelf = unit.shelves.get(String(shelfPosition));
    if (!shelf) {
      return res.status(400).json({ message: `Shelf position ${shelfPosition} does not exist` });
    }
    if (shelf.occupied) {
      return res.status(400).json({ message: `Shelf ${shelfPosition} is already occupied` });
    }

    const now = new Date();
    const dehydrationEndTime = new Date(now.getTime() + 12 * 60 * 60 * 1000); // +12 hours

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
    const allProcessed = cookItem.assignedMoldIds.every((id) => processedMoldIds.includes(id));
    if (allProcessed) {
      cookItem.status = "dehydrating_complete";
      cookItem.dehydratingCompletionTimestamp = now;
    }

    await Promise.all([mold.save(), tray.save(), unit.save(), cookItem.save()]);

    res.json({
      success: true,
      message: allProcessed ? "All molds processed — cook item moved to dehydrating_complete" : "Mold processed successfully",
      mold,
      tray,
      dehydrationEndTime,
      cookItem,
    });
  } catch (error) {
    res.status(500).json({ message: "Error processing mold", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 7: getNextAvailableShelf
// GET /api/pps/stage-2/next-available-shelf
// ─────────────────────────────────────────────────────────

export const getNextAvailableShelf = async (_req: Request, res: Response) => {
  try {
    const units = await DehydratorUnit.find().sort({ unitId: 1 });

    for (const unit of units) {
      for (let i = 1; i <= unit.totalShelves; i++) {
        const shelf = unit.shelves.get(String(i));
        if (shelf && !shelf.occupied) {
          return res.json({ dehydratorUnitId: unit.unitId, shelfPosition: i });
        }
      }
    }

    res.status(404).json({ message: "No available shelves" });
  } catch (error) {
    res.status(500).json({ message: "Error finding available shelf", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 8: getMolds
// GET /api/pps/molds
// ─────────────────────────────────────────────────────────

export const getMolds = async (_req: Request, res: Response) => {
  try {
    const molds = await Mold.find().sort({ moldId: 1 });
    res.json({ molds });
  } catch (error) {
    res.status(500).json({ message: "Error fetching molds", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 9: getDehydratorTrays
// GET /api/pps/dehydrator-trays
// ─────────────────────────────────────────────────────────

export const getDehydratorTrays = async (_req: Request, res: Response) => {
  try {
    const trays = await DehydratorTray.find().sort({ trayId: 1 });
    res.json({ trays });
  } catch (error) {
    res.status(500).json({ message: "Error fetching dehydrator trays", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 10: getDehydratorUnits
// GET /api/pps/dehydrator-units
// ─────────────────────────────────────────────────────────

export const getDehydratorUnits = async (_req: Request, res: Response) => {
  try {
    const units = await DehydratorUnit.find().sort({ unitId: 1 });
    res.json({ units });
  } catch (error) {
    res.status(500).json({ message: "Error fetching dehydrator units", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 11: bulkCreateMolds
// POST /api/pps/molds/bulk
// ─────────────────────────────────────────────────────────

export const bulkCreateMolds = async (req: Request, res: Response) => {
  try {
    const { startNumber, endNumber, prefix = "MOLD", unitsPerMold = 104 } = req.body;

    if (startNumber == null || endNumber == null) {
      return res.status(400).json({ message: "startNumber and endNumber are required" });
    }
    if (startNumber > endNumber) {
      return res.status(400).json({ message: "startNumber must be <= endNumber" });
    }
    if (endNumber - startNumber + 1 > 200) {
      return res.status(400).json({ message: "Cannot create more than 200 molds at once" });
    }

    const docs = [];
    for (let i = startNumber; i <= endNumber; i++) {
      const moldId = `${prefix}-${i}`;
      docs.push({ moldId, barcodeValue: moldId, unitsPerMold, status: "available" });
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
  } catch (error) {
    res.status(500).json({ message: "Error bulk creating molds", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 12: bulkCreateTrays
// POST /api/pps/dehydrator-trays/bulk
// ─────────────────────────────────────────────────────────

export const bulkCreateTrays = async (req: Request, res: Response) => {
  try {
    const { startNumber, endNumber, prefix = "TRAY" } = req.body;

    if (startNumber == null || endNumber == null) {
      return res.status(400).json({ message: "startNumber and endNumber are required" });
    }
    if (startNumber > endNumber) {
      return res.status(400).json({ message: "startNumber must be <= endNumber" });
    }
    if (endNumber - startNumber + 1 > 200) {
      return res.status(400).json({ message: "Cannot create more than 200 trays at once" });
    }

    const docs = [];
    for (let i = startNumber; i <= endNumber; i++) {
      const trayId = `${prefix}-${i}`;
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
  } catch (error) {
    res.status(500).json({ message: "Error bulk creating trays", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 13: bulkCreateDehydratorUnits
// POST /api/pps/dehydrator-units/bulk
// ─────────────────────────────────────────────────────────

export const bulkCreateDehydratorUnits = async (req: Request, res: Response) => {
  try {
    const { startNumber, endNumber, prefix = "UNIT" } = req.body;

    if (startNumber == null || endNumber == null) {
      return res.status(400).json({ message: "startNumber and endNumber are required" });
    }
    if (startNumber > endNumber) {
      return res.status(400).json({ message: "startNumber must be <= endNumber" });
    }
    if (endNumber - startNumber + 1 > 20) {
      return res.status(400).json({ message: "Cannot create more than 20 dehydrator units at once" });
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
  } catch (error) {
    res.status(500).json({ message: "Error bulk creating dehydrator units", error });
  }
};

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
// ─────────────────────────────────────────────────────────

async function completeProduction(
  privateLabOrderId: Types.ObjectId,
  _cookItems: ICookItem[]
) {
  const order = await ClientOrder.findById(privateLabOrderId).populate({
    path: "client",
    populate: { path: "store" },
  });

  if (!order) return;

  order.status = "ready_to_ship";
  await order.save();

  try {
    const { sendReadyToShipNotification } = await import("../jobs/clientOrderJobs");
    await sendReadyToShipNotification(order);
  } catch (err) {
    console.error("Error sending ready to ship notification:", err);
  }
}

// ─────────────────────────────────────────────────────────
// ENDPOINT 14: getStage3CookItems
// GET /api/pps/stage-3/cook-items
// ─────────────────────────────────────────────────────────

export const getStage3CookItems = async (_req: Request, res: Response) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Error fetching Stage 3 cook items", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 15: removeTray
// POST /api/pps/stage-3/remove-tray
// ─────────────────────────────────────────────────────────

export const removeTray = async (req: Request, res: Response) => {
  try {
    const { cookItemId, trayId } = req.body;

    if (!cookItemId || !trayId) {
      return res.status(400).json({ message: "cookItemId and trayId are required" });
    }

    const cookItem = await CookItem.findOne({ cookItemId });
    if (!cookItem) return res.status(404).json({ message: "Cook item not found" });
    if (cookItem.status !== "dehydrating_complete") {
      return res.status(400).json({ message: `Cook item status is "${cookItem.status}", must be dehydrating_complete` });
    }

    const tray = await DehydratorTray.findOne({ trayId });
    if (!tray) return res.status(404).json({ message: "Dehydrator tray not found" });
    if (tray.status !== "in-use" || tray.currentCookItemId !== cookItemId) {
      return res.status(400).json({ message: "Tray is not assigned to this cook item" });
    }

    const removalTimestamp = new Date();
    cookItem.trayRemovalTimestamps.push({ trayId, removalTimestamp });
    await cookItem.save();

    res.json({ success: true, timestamp: removalTimestamp });
  } catch (error) {
    res.status(500).json({ message: "Error logging tray removal", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 16: completeStage3
// POST /api/pps/stage-3/complete
// ─────────────────────────────────────────────────────────

export const completeStage3 = async (req: Request, res: Response) => {
  try {
    const { cookItemId } = req.body;

    if (!cookItemId) {
      return res.status(400).json({ message: "cookItemId is required" });
    }

    const cookItem = await CookItem.findOne({ cookItemId });
    if (!cookItem) return res.status(404).json({ message: "Cook item not found" });
    if (cookItem.status !== "dehydrating_complete") {
      return res.status(400).json({ message: `Cook item status is "${cookItem.status}", must be dehydrating_complete` });
    }

    if (cookItem.trayRemovalTimestamps.length < cookItem.dehydratorAssignments.length) {
      return res.status(400).json({
        message: `Not all trays have been scanned. Expected ${cookItem.dehydratorAssignments.length}, got ${cookItem.trayRemovalTimestamps.length}`,
      });
    }

    const now = new Date();
    cookItem.containerPackedTimestamp = now;
    cookItem.labelPrintTimestamp = now;
    cookItem.demoldingCompletionTimestamp = now;
    cookItem.status = "demolding_complete";

    // Collect units to update (group assignments by dehydratorUnitId)
    const unitMap = new Map<string, IDehydratorUnit>();

    const releasedTrays: string[] = [];
    const releasedShelves: { dehydratorUnitId: string; shelfPosition: number }[] = [];

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
        releasedShelves.push({ dehydratorUnitId: assignment.dehydratorUnitId, shelfPosition: assignment.shelfPosition });
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
  } catch (error) {
    res.status(500).json({ message: "Error completing Stage 3", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 17: scanContainer
// POST /api/pps/stage-4/scan-container
// ─────────────────────────────────────────────────────────

export const scanContainer = async (req: Request, res: Response) => {
  try {
    const { qrCodeData } = req.body;

    if (!qrCodeData) {
      return res.status(400).json({ message: "qrCodeData is required" });
    }

    let parsed: any;
    try {
      parsed = typeof qrCodeData === "string" ? JSON.parse(qrCodeData) : qrCodeData;
    } catch {
      return res.status(400).json({ message: "Invalid qrCodeData — must be valid JSON" });
    }

    const { cookItemId } = parsed;
    if (!cookItemId) {
      return res.status(400).json({ message: "qrCodeData must contain cookItemId" });
    }

    const cookItem = await CookItem.findOne({ cookItemId });
    if (!cookItem) return res.status(404).json({ message: "Cook item not found" });
    if (cookItem.status !== "demolding_complete") {
      return res.status(400).json({ message: `Cook item status is "${cookItem.status}", must be demolding_complete` });
    }

    cookItem.packagingStartTimestamp = new Date();
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
  } catch (error) {
    res.status(500).json({ message: "Error scanning container", error });
  }
};

// ─────────────────────────────────────────────────────────
// ENDPOINT 18: confirmCount
// POST /api/pps/stage-4/confirm-count
// ─────────────────────────────────────────────────────────

export const confirmCount = async (req: Request, res: Response) => {
  try {
    const { cookItemId, actualCount } = req.body;

    if (!cookItemId || actualCount == null) {
      return res.status(400).json({ message: "cookItemId and actualCount are required" });
    }

    const cookItem = await CookItem.findOne({ cookItemId });
    if (!cookItem) return res.status(404).json({ message: "Cook item not found" });
    if (cookItem.status !== "demolding_complete") {
      return res.status(400).json({ message: `Cook item status is "${cookItem.status}", must be demolding_complete` });
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
    await cookItem.save();

    // Check if all cook items for this order are complete
    const allItemsForOrder = await CookItem.find({ orderId: cookItem.orderId });
    const completedCount = allItemsForOrder.filter((i) => i.status === "packaging_casing_complete").length;
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
        },
      })),
      orderStatus: {
        orderId: cookItem.orderId,
        isComplete: allComplete,
        completedItems: completedCount,
        totalItems: allItemsForOrder.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error confirming count", error });
  }
};
