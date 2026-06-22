import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import PromotionCredit from "../../models/PromotionCredit";
import PromotionEnrollment from "../../models/PromotionEnrollment";
import Order from "../../models/Order";
import PartnershipBill from "../../models/PartnershipBill";
import { AppError } from "../../utils/AppError";

// GET /api/promotions/credits?storeId=&page=&limit=
export const getPromotionCredits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.query;
    if (!storeId) return next(new AppError("storeId is required", 400));

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter = { storeId: new Types.ObjectId(storeId as string) };

    const [credits, totalCount, enrollment] = await Promise.all([
      PromotionCredit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PromotionCredit.countDocuments(filter),
      PromotionEnrollment.findOne({ storeId: new Types.ObjectId(storeId as string) }, "creditBalance"),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;
    res.json({
      success: true,
      credits,
      creditBalance: enrollment?.creditBalance ?? 0,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/promotions/credits/apply
// Apply credit to an order or partnership bill
export const applyPromotionCredit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId, amount, orderId, partnershipBillId, description } = req.body;

    const enrollment = await PromotionEnrollment.findOne({
      storeId: new Types.ObjectId(storeId),
    });
    if (!enrollment) return next(new AppError("Store has no promotion enrollment", 404));
    if (enrollment.creditBalance < amount) {
      return next(new AppError("Insufficient credit balance", 400));
    }
    if (!orderId && !partnershipBillId) {
      return next(new AppError("Must specify orderId or partnershipBillId", 400));
    }

    // Find an available earned credit to reference (take the oldest available)
    const sourceCredit = await PromotionCredit.findOne({
      storeId: new Types.ObjectId(storeId),
      type: "earned",
      status: "available",
    }).sort({ createdAt: 1 });

    if (!sourceCredit) return next(new AppError("No available credits to apply", 400));

    const creditDesc = description ?? `Credit applied — $${amount.toFixed(2)}`;

    // Create the applied ledger entry
    const appliedCredit = await PromotionCredit.create({
      storeId: new Types.ObjectId(storeId),
      storePromotionId: sourceCredit.storePromotionId,
      amount,
      description: creditDesc,
      type: "applied",
      appliedToOrderId: orderId ? new Types.ObjectId(orderId) : undefined,
      appliedToPartnershipBillId: partnershipBillId ? new Types.ObjectId(partnershipBillId) : undefined,
      status: "applied",
      appliedAt: new Date(),
    });

    // Decrement enrollment balance
    enrollment.creditBalance = parseFloat((enrollment.creditBalance - amount).toFixed(2));
    await enrollment.save();

    // Apply to Order.discount
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, { $inc: { discount: amount } });
    }

    // Apply to PartnershipBill
    if (partnershipBillId) {
      const bill = await PartnershipBill.findById(partnershipBillId);
      if (bill) {
        bill.credits.push({ amount, reason: creditDesc, appliedAt: new Date() });
        bill.creditsTotal = bill.credits.reduce((sum, c) => sum + c.amount, 0);
        bill.total = Math.max(0, bill.subtotal - bill.creditsTotal);
        await bill.save();
      }
    }

    res.json({ success: true, credit: appliedCredit, creditBalance: enrollment.creditBalance });
  } catch (err) {
    next(err);
  }
};
