import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import PartnershipEnrollment from "../../models/PartnershipEnrollment";
import PartnershipInventory from "../../models/PartnershipInventory";
import PartnershipSale from "../../models/PartnershipSale";
import { AppError } from "../../utils/AppError";

// POST /api/partnership/pos/sales
// Auth: X-Partnership-Key header
export const receivePosData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers["x-partnership-key"] as string;
    if (!apiKey) return next(new AppError("Missing X-Partnership-Key header", 401));

    const enrollment = await PartnershipEnrollment.findOne({ posApiKey: apiKey });
    if (!enrollment || enrollment.status !== "active") {
      return next(new AppError("Invalid or inactive partnership key", 401));
    }

    const { date, items } = req.body;
    const storeId = enrollment.storeId;

    // Parse date string to UTC midnight
    const saleDate = new Date(`${date}T00:00:00.000Z`);

    let processed = 0;
    let skipped = 0;

    for (const item of items) {
      const inventory = await PartnershipInventory.findOne({
        storeId,
        sku: item.sku.trim().toUpperCase(),
      });

      if (!inventory) {
        console.warn(`[POS] SKU not found: ${item.sku} for store ${storeId}`);
        skipped++;
        continue;
      }

      // Idempotent upsert — re-sends overwrite with same value
      await PartnershipSale.findOneAndUpdate(
        { storeId, productId: inventory.productId, date: saleDate },
        {
          $set: {
            sku: item.sku,
            unitsSold: item.unitsSold,
            source: "pos_api",
            receivedAt: new Date(),
          },
        },
        { upsert: true }
      );

      // Recalculate total sold from all sale records for this product
      const agg = await PartnershipSale.aggregate([
        { $match: { storeId: new Types.ObjectId(storeId.toString()), productId: inventory.productId } },
        { $group: { _id: null, total: { $sum: "$unitsSold" } } },
      ]);
      const totalSold = agg[0]?.total ?? 0;

      await PartnershipInventory.findByIdAndUpdate(inventory._id, {
        $set: {
          unitsSold: totalSold,
          unitsRemaining: inventory.unitsPlaced - totalSold,
        },
      });

      processed++;
    }

    // Mark POS as connected on first successful call
    if (!enrollment.posApiConnected) {
      enrollment.posApiConnected = true;
      if (enrollment.status === "pending_setup") enrollment.status = "active";
      await enrollment.save();
    }

    res.json({ success: true, processed, skipped });
  } catch (err) {
    next(err);
  }
};

// GET /api/partnership/sales?storeId=&startDate=&endDate=
// GET /api/admin/partnership/:storeId/sales?startDate=&endDate=
export const getSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = (req.params.storeId || req.query.storeId) as string;
    if (!storeId) return next(new AppError("storeId is required", 400));

    const { startDate, endDate } = req.query;
    const filter: Record<string, any> = { storeId: new Types.ObjectId(storeId) };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) filter.date.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const sales = await PartnershipSale.find(filter).sort({ date: -1 });
    res.json({ success: true, sales });
  } catch (err) {
    next(err);
  }
};
