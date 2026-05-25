import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import LabelInventory from "../../models/LabelInventory";
import { Label } from "../../models/Label";
import { AppError } from "../../utils/AppError";

// GET /api/pps/package-prep/inventory
export const getLabelInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.query as { storeId?: string };

    const filter: Record<string, unknown> = {};
    if (storeId) filter.storeId = new mongoose.Types.ObjectId(storeId);

    const docs = await LabelInventory.find(filter).sort({ storeName: 1, labelName: 1 });

    const labelIds = [...new Set(docs.map((d) => d.labelId.toString()))];
    const labels = await Label.find({ _id: { $in: labelIds } }).select("labelImages");
    const labelImageMap = new Map(
      labels.map((l) => [(l._id as any).toString(), (l as any).labelImages?.[0]?.secureUrl ?? null])
    );

    const inventory = docs.map((doc) => {
      const obj = doc.toObject();
      const totalStock = doc.unprocessed + doc.labeled + doc.printed;
      return {
        ...obj,
        totalStock,
        belowThreshold: doc.reorderThreshold > 0 && totalStock < doc.reorderThreshold,
        labelImageUrl: labelImageMap.get(doc.labelId.toString()) ?? null,
      };
    });

    res.json({ success: true, inventory });
  } catch (err) {
    next(err);
  }
};

// GET /api/pps/package-prep/inventory/summary
export const getInventorySummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const docs = await LabelInventory.find().sort({ storeName: 1, labelName: 1 });

    let totalUnprocessed = 0;
    let totalLabeled = 0;
    let totalPrinted = 0;
    let belowThresholdCount = 0;

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
      const isBelowThreshold = doc.reorderThreshold > 0 && totalStock < doc.reorderThreshold;
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

// POST /api/pps/package-prep/inventory/apply
export const applyLabels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId, labelId, quantity } = req.body;

    const inv = await LabelInventory.findOne({
      storeId: new mongoose.Types.ObjectId(storeId),
      labelId: new mongoose.Types.ObjectId(labelId),
    });

    if (!inv) return next(new AppError("Inventory record not found", 404));

    inv.unprocessed = Math.max(0, inv.unprocessed - quantity);
    inv.labeled += quantity;
    await inv.save();

    res.json({ success: true, inventory: inv });
  } catch (err) {
    next(err);
  }
};

// POST /api/pps/package-prep/inventory/print
export const printLabels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId, labelId, quantity, lotNumber, thcPercent, testDate } = req.body;

    const inv = await LabelInventory.findOne({
      storeId: new mongoose.Types.ObjectId(storeId),
      labelId: new mongoose.Types.ObjectId(labelId),
    });

    if (!inv) return next(new AppError("Inventory record not found", 404));
    if (inv.labeled < quantity) {
      return next(
        new AppError(`Cannot print ${quantity} — only ${inv.labeled} labeled bags available`, 400)
      );
    }

    inv.labeled -= quantity;
    inv.printed += quantity;
    if (lotNumber || thcPercent || testDate) {
      inv.lastPrintData = {
        lotNumber: lotNumber ?? "",
        thcPercent: thcPercent ?? "",
        testDate: testDate ?? "",
      };
    }
    await inv.save();

    res.json({ success: true, inventory: inv });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/pps/package-prep/inventory/:inventoryId/threshold
export const setReorderThreshold = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { inventoryId } = req.params;
    const { reorderThreshold } = req.body;

    const inv = await LabelInventory.findByIdAndUpdate(
      inventoryId,
      { reorderThreshold },
      { new: true }
    );

    if (!inv) return next(new AppError("Inventory record not found", 404));

    res.json({ success: true, inventory: inv });
  } catch (err) {
    next(err);
  }
};
