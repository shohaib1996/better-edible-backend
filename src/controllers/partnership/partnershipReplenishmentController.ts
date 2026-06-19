import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import PartnershipReplenishment from "../../models/PartnershipReplenishment";
import PartnershipInventory from "../../models/PartnershipInventory";
import { AppError } from "../../utils/AppError";

// GET /api/partnership/replenishments?storeId=
// GET /api/admin/partnership/:storeId/replenishments
export const getReplenishments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = (req.params.storeId || req.query.storeId) as string;
    if (!storeId) return next(new AppError("storeId is required", 400));

    const replenishments = await PartnershipReplenishment.find({
      storeId: new Types.ObjectId(storeId),
    }).sort({ requestedAt: -1 });

    res.json({ success: true, replenishments });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/partnership/:storeId/replenishment
export const createReplenishment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.params;
    const { items } = req.body;

    const enrichedItems = await Promise.all(
      items.map(async (item: { productId: string; unitsRequested: number }) => {
        const inventory = await PartnershipInventory.findOne({
          storeId: new Types.ObjectId(storeId),
          productId: new Types.ObjectId(item.productId),
        });
        if (!inventory) throw new AppError(`Product not found in store inventory: ${item.productId}`, 404);

        return {
          productId: new Types.ObjectId(item.productId),
          productName: inventory.productName,
          sku: inventory.sku,
          unitsRequested: item.unitsRequested,
        };
      })
    );

    const replenishment = await PartnershipReplenishment.create({
      storeId: new Types.ObjectId(storeId),
      status: "pending",
      items: enrichedItems,
      requestedAt: new Date(),
    });

    res.status(201).json({ success: true, replenishment });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/partnership/replenishment/:id/status
export const updateReplenishmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const replenishment = await PartnershipReplenishment.findById(id);
    if (!replenishment) return next(new AppError("Replenishment not found", 404));

    replenishment.status = status;
    if (status === "delivered") replenishment.deliveredAt = new Date();

    await replenishment.save();
    res.json({ success: true, replenishment });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/partnership/replenishment/:id/deliver
export const deliverReplenishment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { driverCounts, driverNotes } = req.body;

    const replenishment = await PartnershipReplenishment.findById(id);
    if (!replenishment) return next(new AppError("Replenishment not found", 404));

    if (!["in_transit", "delivered"].includes(replenishment.status)) {
      return next(new AppError("Replenishment must be in_transit or delivered to reconcile", 400));
    }

    replenishment.driverCounts = driverCounts.map((dc: { productId: string; actualCount: number }) => ({
      productId: new Types.ObjectId(dc.productId),
      sku: replenishment.items.find((i) => i.productId.toString() === dc.productId)?.sku || "",
      actualCount: dc.actualCount,
    }));
    if (driverNotes) replenishment.driverNotes = driverNotes;
    replenishment.status = "reconciled";
    if (!replenishment.deliveredAt) replenishment.deliveredAt = new Date();

    await replenishment.save();

    // Override unitsRemaining with driver physical count — source of truth
    await Promise.all(
      driverCounts.map(async (dc: { productId: string; actualCount: number }) => {
        await PartnershipInventory.findOneAndUpdate(
          {
            storeId: replenishment.storeId,
            productId: new Types.ObjectId(dc.productId),
          },
          {
            $set: {
              unitsRemaining: dc.actualCount,
              lastReconciliationAt: new Date(),
            },
          }
        );
      })
    );

    res.json({ success: true, replenishment });
  } catch (err) {
    next(err);
  }
};
