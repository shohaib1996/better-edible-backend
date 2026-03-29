import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import LabelOrder from "../models/LabelOrder";
import LabelInventory from "../models/LabelInventory";
import { Store } from "../models/Store";
import { Label } from "../models/Label";
import { AppError } from "../utils/AppError";

// ─────────────────────────────────────────────
// ENDPOINT 1: getActiveLabelOrders
// GET /api/pps/package-prep/orders
// Returns all orders with status "on_order" sorted by orderedAt desc
// ─────────────────────────────────────────────
export const getActiveLabelOrders = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orders = await LabelOrder.find({ status: "on_order" }).sort({
      orderedAt: -1,
    });

    // Attach label image URL by looking up each
    const labelIds = [...new Set(orders.map((o) => o.labelId.toString()))];
    const labels = await Label.find({ _id: { $in: labelIds } }).select(
      "labelImages",
    );
    const labelImageMap = new Map(
      labels.map((l) => [
        (l._id as any).toString(),
        (l as any).labelImages?.[0]?.secureUrl ?? null,
      ]),
    );

    const ordersWithImage = orders.map((o) => ({
      ...o.toObject(),
      labelImageUrl: labelImageMap.get(o.labelId.toString()) ?? null,
    }));

    res.json({ success: true, orders: ordersWithImage });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// ENDPOINT 2: createLabelOrder (ADMIN ONLY)
// POST /api/pps/package-prep/orders
// ─────────────────────────────────────────────
export const createLabelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { storeId, labelId, quantityOrdered, notes } = req.body;

    // Fetch store and label for denormalization
    const [store, label] = await Promise.all([
      Store.findById(storeId),
      Label.findById(labelId),
    ]);

    if (!store) return next(new AppError("Store not found", 404));
    if (!label) return next(new AppError("Label not found", 404));

    const order = await LabelOrder.create({
      storeId: new mongoose.Types.ObjectId(storeId),
      storeName: store.name,
      labelId: new mongoose.Types.ObjectId(labelId),
      labelName: label.flavorName,
      itemId: label.itemId || "",
      quantityOrdered,
      notes,
      orderedAt: new Date(),
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// ENDPOINT 3: receiveLabelOrder
// POST /api/pps/package-prep/orders/:orderId/receive
// Body: { quantityReceived }
// No upper bound — may receive more than ordered
// ─────────────────────────────────────────────
export const receiveLabelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderId } = req.params;
    const { quantityReceived } = req.body;

    const order = await LabelOrder.findById(orderId);
    if (!order) return next(new AppError("Label order not found", 404));
    if (order.status === "received") {
      return next(new AppError("Order has already been received", 400));
    }

    // Update the order
    order.quantityReceived = quantityReceived;
    order.status = "received";
    await order.save();

    // Upsert LabelInventory — increment unprocessed
    const inventory = await LabelInventory.findOneAndUpdate(
      { storeId: order.storeId, labelId: order.labelId },
      {
        $inc: { unprocessed: quantityReceived },
        $setOnInsert: {
          storeName: order.storeName,
          labelName: order.labelName,
          itemId: order.itemId,
        },
      },
      { upsert: true, new: true },
    );

    res.json({ success: true, order, inventory });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// ENDPOINT 4: getLabelInventory
// GET /api/pps/package-prep/inventory
// Query: storeId? (optional filter)
// ─────────────────────────────────────────────
export const getLabelInventory = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { storeId } = req.query as { storeId?: string };

    const filter: Record<string, unknown> = {};
    if (storeId) filter.storeId = new mongoose.Types.ObjectId(storeId);

    const docs = await LabelInventory.find(filter).sort({
      storeName: 1,
      labelName: 1,
    });

    // Attach label image URLs
    const labelIds = [...new Set(docs.map((d) => d.labelId.toString()))];
    const labels = await Label.find({ _id: { $in: labelIds } }).select(
      "labelImages",
    );
    const labelImageMap = new Map(
      labels.map((l) => [
        (l._id as any).toString(),
        (l as any).labelImages?.[0]?.secureUrl ?? null,
      ]),
    );

    // Annotate each with belowThreshold flag and labelImageUrl
    const inventory = docs.map((doc) => {
      const obj = doc.toObject();
      const totalStock = doc.unprocessed + doc.labeled + doc.printed;
      return {
        ...obj,
        totalStock,
        belowThreshold:
          doc.reorderThreshold > 0 && totalStock < doc.reorderThreshold,
        labelImageUrl: labelImageMap.get(doc.labelId.toString()) ?? null,
      };
    });

    res.json({ success: true, inventory });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// ENDPOINT 5: applyLabels
// POST /api/pps/package-prep/inventory/apply
// Body: { storeId, labelId, quantity }
// Moves units from unprocessed → labeled
// ─────────────────────────────────────────────
export const applyLabels = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { storeId, labelId, quantity } = req.body;

    const inv = await LabelInventory.findOne({
      storeId: new mongoose.Types.ObjectId(storeId),
      labelId: new mongoose.Types.ObjectId(labelId),
    });

    if (!inv) return next(new AppError("Inventory record not found", 404));
    if (inv.unprocessed < quantity) {
      return next(
        new AppError(
          `Cannot apply ${quantity} — only ${inv.unprocessed} unprocessed labels available`,
          400,
        ),
      );
    }

    inv.unprocessed -= quantity;
    inv.labeled += quantity;
    await inv.save();

    res.json({ success: true, inventory: inv });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// ENDPOINT 6: printLabels
// POST /api/pps/package-prep/inventory/print
// Body: { storeId, labelId, quantity, lotNumber, thcPercent, testDate }
// Moves units from labeled → printed
// ─────────────────────────────────────────────
export const printLabels = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { storeId, labelId, quantity, lotNumber, thcPercent, testDate } =
      req.body;

    const inv = await LabelInventory.findOne({
      storeId: new mongoose.Types.ObjectId(storeId),
      labelId: new mongoose.Types.ObjectId(labelId),
    });

    if (!inv) return next(new AppError("Inventory record not found", 404));
    if (inv.labeled < quantity) {
      return next(
        new AppError(
          `Cannot print ${quantity} — only ${inv.labeled} labeled bags available`,
          400,
        ),
      );
    }

    inv.labeled -= quantity;
    inv.printed += quantity;
    inv.lastPrintData = { lotNumber, thcPercent, testDate };
    await inv.save();

    res.json({ success: true, inventory: inv });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// ENDPOINT 7: getInventorySummary
// GET /api/pps/package-prep/inventory/summary
// Returns aggregated totals across all stores
// ─────────────────────────────────────────────
export const getInventorySummary = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const docs = await LabelInventory.find().sort({
      storeName: 1,
      labelName: 1,
    });

    let totalUnprocessed = 0;
    let totalLabeled = 0;
    let totalPrinted = 0;
    let belowThresholdCount = 0;

    // Group by store
    const storeMap = new Map<
      string,
      {
        storeId: string;
        storeName: string;
        unprocessed: number;
        labeled: number;
        printed: number;
        belowThresholdCount: number;
      }
    >();

    for (const doc of docs) {
      totalUnprocessed += doc.unprocessed;
      totalLabeled += doc.labeled;
      totalPrinted += doc.printed;

      const totalStock = doc.unprocessed + doc.labeled + doc.printed;
      const isBelowThreshold =
        doc.reorderThreshold > 0 && totalStock < doc.reorderThreshold;
      if (isBelowThreshold) belowThresholdCount++;

      const storeKey = doc.storeId.toString();
      if (!storeMap.has(storeKey)) {
        storeMap.set(storeKey, {
          storeId: storeKey,
          storeName: doc.storeName,
          unprocessed: 0,
          labeled: 0,
          printed: 0,
          belowThresholdCount: 0,
        });
      }
      const entry = storeMap.get(storeKey)!;
      entry.unprocessed += doc.unprocessed;
      entry.labeled += doc.labeled;
      entry.printed += doc.printed;
      if (isBelowThreshold) entry.belowThresholdCount++;
    }

    res.json({
      success: true,
      totalUnprocessed,
      totalLabeled,
      totalPrinted,
      belowThresholdCount,
      byStore: Array.from(storeMap.values()),
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
// ENDPOINT 8: setReorderThreshold (ADMIN ONLY)
// PATCH /api/pps/package-prep/inventory/:inventoryId/threshold
// Body: { reorderThreshold }
// ─────────────────────────────────────────────
export const setReorderThreshold = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { inventoryId } = req.params;
    const { reorderThreshold } = req.body;

    const inv = await LabelInventory.findByIdAndUpdate(
      inventoryId,
      { reorderThreshold },
      { new: true },
    );

    if (!inv) return next(new AppError("Inventory record not found", 404));

    res.json({ success: true, inventory: inv });
  } catch (err) {
    next(err);
  }
};
