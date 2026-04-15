import { CookItem } from "../models/CookItem";
import { Mold } from "../models/Mold";
import { OilContainer } from "../models/OilContainer";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { extractPerformedBy } from "./ppsHelpers";

// ─────────────────────────────────────────────────────────
// bulkCreateCookItems
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

  const { ClientOrder } = await import("../models/ClientOrder");
  const { Label } = await import("../models/Label");

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

  const normalizedOrderNumber = (order.orderNumber as string).replace("-", "");

  const cookItemDocs = await Promise.all(
    items.map(async (item: any) => {
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
// getStage1CookItems
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
// assignMold
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

  const mold = await Mold.findOneAndUpdate(
    { moldId, status: "available" },
    { status: "in-use", currentCookItemId: cookItemId },
    { new: true },
  );

  if (!mold) throw new AppError("Mold not found or already in use", 400);

  const now = new Date();
  const { unitsPerMold } = req.body;
  const units = typeof unitsPerMold === "number" ? unitsPerMold : (mold.unitsPerMold ?? 70);
  cookItem.assignedMoldIds.push(moldId);
  cookItem.moldingTimestamps.push({ moldId, unitsPerMold: units, startTimestamp: now });

  if (cookItem.status === "pending") {
    cookItem.status = "in-progress";
    cookItem.cookingMoldingStartTimestamp = now;
  }

  cookItem.history.push({
    action: "mold_assigned",
    performedBy,
    detail: `Mold ${moldId} assigned (${units} units)`,
    timestamp: now,
  });

  await cookItem.save();

  res.json({ success: true, cookItem, mold });
});

// ─────────────────────────────────────────────────────────
// unassignMold
// DELETE /api/pps/stage-1/unassign-mold
// ─────────────────────────────────────────────────────────

export const unassignMold = asyncHandler(async (req, res) => {
  const { cookItemId, moldId } = req.body;
  const performedBy = extractPerformedBy(req.body);

  if (!cookItemId || !moldId) {
    throw new AppError("cookItemId and moldId are required", 400);
  }

  const cookItem = await CookItem.findOne({ cookItemId });
  if (!cookItem) throw new AppError("Cook item not found", 404);
  if (!["pending", "in-progress"].includes(cookItem.status)) {
    throw new AppError(
      `Cook item status is "${cookItem.status}", must be pending or in-progress to unassign a mold`,
      400,
    );
  }

  const mold = await Mold.findOneAndUpdate(
    { moldId },
    { status: "available", currentCookItemId: null },
    { new: true },
  );
  if (!mold) throw new AppError("Mold not found", 404);

  cookItem.assignedMoldIds = cookItem.assignedMoldIds.filter((id) => id !== moldId);
  cookItem.moldingTimestamps = cookItem.moldingTimestamps.filter((t) => t.moldId !== moldId);

  if (cookItem.assignedMoldIds.length === 0) {
    cookItem.status = "pending";
    cookItem.cookingMoldingStartTimestamp = undefined;
  }

  cookItem.history.push({
    action: "mold_unassigned",
    performedBy,
    detail: `Mold ${moldId} removed`,
    timestamp: new Date(),
  });

  await cookItem.save();

  res.json({ success: true, cookItem, mold });
});

// ─────────────────────────────────────────────────────────
// completeStage1
// PATCH /api/pps/stage-1/complete
// ─────────────────────────────────────────────────────────

export const completeStage1 = asyncHandler(async (req, res) => {
  const { cookItemId, oilContainerId, oilCalculatedAmount, oilActualAmount } = req.body;
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

  // ── Oil drawdown (optional — only if container was selected) ──
  if (oilContainerId && oilActualAmount) {
    const container = await OilContainer.findOne({ containerId: oilContainerId });
    if (!container) throw new AppError(`Oil container "${oilContainerId}" not found`, 404);
    if (container.status !== "active") {
      throw new AppError(`Oil container is "${container.status}" — not available`, 400);
    }
    if (container.remainingAmount < oilActualAmount) {
      throw new AppError(
        `Insufficient oil — container has ${container.remainingAmount}g, need ${oilActualAmount}g`,
        400,
      );
    }

    const balanceBefore = container.remainingAmount;
    container.remainingAmount = Math.round((container.remainingAmount - oilActualAmount) * 100) / 100;
    if (container.remainingAmount <= 0) {
      container.remainingAmount = 0;
      container.status = "empty";
    }
    container.history.push({
      action: "drawdown",
      amount: oilActualAmount,
      balanceBefore,
      balanceAfter: container.remainingAmount,
      performedBy: { userId: performedBy.userId, userName: performedBy.userName },
      note: `CookItem: ${cookItemId}`,
      timestamp: new Date(),
    });
    await container.save();

    cookItem.oilContainerId = oilContainerId;
    cookItem.oilCalculatedAmount = oilCalculatedAmount;
    cookItem.oilActualAmount = oilActualAmount;
  }

  const now = new Date();
  cookItem.cookingMoldingCompletionTimestamp = now;

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
