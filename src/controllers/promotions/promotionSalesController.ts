import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import StorePromotion from "../../models/StorePromotion";
import PromotionSale from "../../models/PromotionSale";
import PromotionCredit from "../../models/PromotionCredit";
import PromotionEnrollment from "../../models/PromotionEnrollment";
import Promotion from "../../models/Promotion";
import { AppError } from "../../utils/AppError";

// POST /api/promotions/sales/:storePromotionId
// Manual sales log by the store
export const logPromotionSales = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storePromotionId } = req.params;
    const { storeId, unitsSold, date } = req.body;

    const storePromotion = await StorePromotion.findById(storePromotionId);
    if (!storePromotion) return next(new AppError("Promotion not found", 404));
    if (storePromotion.storeId.toString() !== storeId) {
      return next(new AppError("Unauthorized", 403));
    }
    if (!["active", "pending_sales_log"].includes(storePromotion.status)) {
      return next(new AppError("Cannot log sales for this promotion in its current state", 400));
    }

    // Get creditRatePerUnit — from linked Promotion or custom fields
    let creditRatePerUnit = storePromotion.creditRatePerUnit ?? 0;
    let productId = storePromotion.productId;

    if (storePromotion.type === "company" && storePromotion.promotionId) {
      const promotion = await Promotion.findById(storePromotion.promotionId);
      if (promotion) {
        creditRatePerUnit = promotion.creditRatePerUnit;
        productId = promotion.productId;
      }
    }

    if (!productId) return next(new AppError("Product not linked to promotion", 400));

    const saleDate = new Date(`${date}T00:00:00.000Z`);

    // Idempotent upsert — same date re-sends overwrite
    await PromotionSale.findOneAndUpdate(
      { storeId: new Types.ObjectId(storeId), storePromotionId: new Types.ObjectId(storePromotionId), date: saleDate },
      {
        $set: {
          promotionId: storePromotion.promotionId,
          productId,
          unitsSold,
          source: "manual",
          receivedAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Recalculate total units from all sale records
    const agg = await PromotionSale.aggregate([
      { $match: { storePromotionId: new Types.ObjectId(storePromotionId) } },
      { $group: { _id: null, total: { $sum: "$unitsSold" } } },
    ]);
    const totalUnitsSold = agg[0]?.total ?? 0;
    const creditsEarned = parseFloat((totalUnitsSold * creditRatePerUnit).toFixed(2));

    // Update StorePromotion totals + mark as sales_logged
    storePromotion.unitsSold = totalUnitsSold;
    storePromotion.creditsEarned = creditsEarned;
    storePromotion.status = "sales_logged";
    storePromotion.salesLoggedAt = new Date();
    await storePromotion.save();

    // Create earned credit ledger entry
    await PromotionCredit.create({
      storeId: new Types.ObjectId(storeId),
      storePromotionId: new Types.ObjectId(storePromotionId),
      amount: creditsEarned,
      description: `${storePromotion.name ?? "Promotion"} — ${totalUnitsSold} units × $${creditRatePerUnit.toFixed(2)}`,
      type: "earned",
      status: "available",
    });

    // Increment enrollment creditBalance
    await PromotionEnrollment.findOneAndUpdate(
      { storeId: new Types.ObjectId(storeId) },
      { $inc: { creditBalance: creditsEarned } }
    );

    res.json({ success: true, storePromotion, creditsEarned });
  } catch (err) {
    next(err);
  }
};
