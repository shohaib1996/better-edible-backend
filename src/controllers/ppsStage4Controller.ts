import { CookItem } from "../models/CookItem";
import { Case } from "../models/Case";
import { ClientOrder } from "../models/ClientOrder";
import LabelInventory from "../models/LabelInventory";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { extractPerformedBy, formatTimestamp } from "./ppsHelpers";
import type { ICookItem } from "../models/CookItem";
import { Types } from "mongoose";

// ─────────────────────────────────────────────────────────
// INTERNAL: completeProduction
// Called when all cook items for an order reach packaging_casing_complete
// ─────────────────────────────────────────────────────────

async function completeProduction(privateLabOrderId: Types.ObjectId, _cookItems: ICookItem[]) {
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
// getStage4CookItems
// GET /api/pps/stage-4/cook-items
// ─────────────────────────────────────────────────────────

export const getStage4CookItems = asyncHandler(async (_req, res) => {
  const cookItems = await CookItem.find({
    status: { $in: ["bag_seal_complete", "packaging_casing_complete"] },
  })
    .sort({ createdAt: 1 })
    .lean();

  res.json({ cookItems });
});

// ─────────────────────────────────────────────────────────
// scanContainer
// POST /api/pps/stage-4/scan-container
// ─────────────────────────────────────────────────────────

export const scanContainer = asyncHandler(async (req, res) => {
  const { qrCodeData } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!qrCodeData) throw new AppError("qrCodeData is required", 400);

  let cookItemId: string;
  if (typeof qrCodeData === "string") {
    try {
      const parsed = JSON.parse(qrCodeData);
      cookItemId = parsed.cookItemId;
    } catch {
      cookItemId = qrCodeData.trim();
    }
  } else if (typeof qrCodeData === "object" && qrCodeData.cookItemId) {
    cookItemId = qrCodeData.cookItemId;
  } else {
    throw new AppError("Invalid qrCodeData", 400);
  }

  if (!cookItemId) throw new AppError("Could not extract cookItemId from qrCodeData", 400);

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (cookItem.status !== "bag_seal_complete") {
    throw new AppError(`Cook item status is "${cookItem.status}", must be bag_seal_complete`, 400);
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
// getCaseById
// GET /api/pps/cases/:caseId
// ─────────────────────────────────────────────────────────

export const getCaseById = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const caseDoc = await Case.findOne({ caseId }).lean();
  if (!caseDoc) throw new AppError("Case not found", 404);
  res.json({ success: true, case: caseDoc });
});

// ─────────────────────────────────────────────────────────
// getCookItemHistory
// GET /api/pps/cook-items/:cookItemId/history
// ─────────────────────────────────────────────────────────

export const getCookItemHistory = asyncHandler(async (req, res) => {
  const { cookItemId } = req.params;

  const cookItem = await CookItem.findOne({ cookItemId }).lean();
  if (!cookItem) throw new AppError("Cook item not found", 404);

  const history = (cookItem.history || []).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  res.json({ cookItemId, history });
});

// ─────────────────────────────────────────────────────────
// confirmCount
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
  if (cookItem.status !== "bag_seal_complete") {
    throw new AppError(`Cook item status is "${cookItem.status}", must be bag_seal_complete`, 400);
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

  await LabelInventory.findOneAndUpdate(
    { labelId: cookItem.labelId, storeName: cookItem.storeName },
    [{ $set: { printed: { $max: [0, { $subtract: ["$printed", actualCount] }] } } }]
  );

  const allItemsForOrder = await CookItem.find({ orderId: cookItem.orderId });
  const completedCount = allItemsForOrder.filter(
    (i) => i.status === "packaging_casing_complete"
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
        orderId: c.orderId,
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
