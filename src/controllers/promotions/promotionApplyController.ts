import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import Promotion from "../../models/Promotion";
import PromotionUsage from "../../models/PromotionUsage";
import { Order } from "../../models/Order";
import { AppError } from "../../utils/AppError";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function computeDiscount(type: "flat" | "percentage", value: number, orderTotal: number): number {
  if (type === "flat") return Math.min(value, orderTotal);
  return parseFloat(((orderTotal * value) / 100).toFixed(2));
}

async function findEligiblePromotion(
  code: string | undefined,
  storeId: string,
  orderTotal: number,
  autoApplyOnly = false
) {
  const now = new Date();
  const filter: any = {
    status: "active",
    $and: [
      { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] },
    ],
  };

  if (autoApplyOnly) {
    filter.autoApply = true;
    filter.minOrderAmount = { $lte: orderTotal };
  } else if (code) {
    filter.code = code.toUpperCase().trim();
  } else {
    return null;
  }

  // Restrict to store if storeIds is set
  const storeObjId = new Types.ObjectId(storeId);
  filter.$or = [{ storeIds: { $size: 0 } }, { storeIds: storeObjId }];

  const promotions = await Promotion.find(filter).sort({ value: -1 });

  for (const promo of promotions) {
    // Check order minimum
    if (promo.minOrderAmount && orderTotal < promo.minOrderAmount) continue;

    // Check global usage limit
    if (promo.maxUses && promo.usedCount >= promo.maxUses) continue;

    // Check per-store usage limit
    if (promo.maxUsesPerStore) {
      const storeUseCount = await PromotionUsage.countDocuments({
        promotionId: promo._id,
        storeId: storeObjId,
      });
      if (storeUseCount >= promo.maxUsesPerStore) continue;
    }

    return promo;
  }

  return null;
}

// ──────────────────────────────────────────────
// POST /api/promotions/validate
// Body: { code, storeId, orderTotal }
// ──────────────────────────────────────────────
export const validatePromoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, storeId, orderTotal } = req.body;
    if (!code || !storeId || orderTotal === undefined) {
      return next(new AppError("code, storeId and orderTotal are required", 400));
    }

    const promo = await findEligiblePromotion(code, storeId, Number(orderTotal));
    if (!promo) return next(new AppError("Invalid or ineligible promo code", 400));

    const discount = computeDiscount(promo.type, promo.value, Number(orderTotal));

    res.json({
      success: true,
      promotionId: promo._id,
      code: promo.code,
      name: promo.name,
      type: promo.type,
      value: promo.value,
      discount,
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────
// GET /api/promotions/auto-apply?storeId=&orderTotal=
// ──────────────────────────────────────────────
export const getAutoApplyPromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId, orderTotal } = req.query;
    if (!storeId || orderTotal === undefined) {
      return next(new AppError("storeId and orderTotal are required", 400));
    }

    const promo = await findEligiblePromotion(
      undefined,
      storeId as string,
      Number(orderTotal),
      true
    );
    if (!promo) return res.json({ success: true, promotion: null, discount: 0 });

    const discount = computeDiscount(promo.type, promo.value, Number(orderTotal));
    res.json({ success: true, promotion: promo, discount });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────
// GET /api/promotions/public
// Returns active public promotions visible in store portal
// ──────────────────────────────────────────────
export const getPublicPromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.query;
    const now = new Date();

    const baseFilter: Record<string, unknown> = {
      status: "active",
      isPublic: true,
      $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }],
      $and: [{ $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] }],
    };

    if (storeId) {
      const storeObjId = new Types.ObjectId(storeId as string);
      (baseFilter as any)["$or"] = [{ storeIds: { $size: 0 } }, { storeIds: storeObjId }];
    }

    const promotions = await Promotion.find(baseFilter).sort({ createdAt: -1 });
    res.json({ success: true, promotions });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────
// GET /api/promotions/for-store?storeId=
// Returns all promotions a specific store can see:
//   - public promos open to all stores
//   - public promos targeted to this store
//   - private promos targeted specifically to this store
// ──────────────────────────────────────────────
export const getStorePromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.query;
    if (!storeId) return next(new AppError("storeId is required", 400));

    const now = new Date();
    const storeObjId = new Types.ObjectId(storeId as string);

    const timeFilter = {
      $and: [
        { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] },
      ],
    };

    const promotions = await Promotion.find({
      status: "active",
      ...timeFilter,
      $or: [{ isPublic: true, storeIds: { $size: 0 } }, { storeIds: storeObjId }],
    }).sort({ createdAt: -1 });

    // Filter out promos this store has already exhausted
    const eligible = await Promise.all(
      promotions.map(async (promo) => {
        // Global usage cap hit
        if (promo.maxUses && promo.usedCount >= promo.maxUses) return null;
        // Per-store usage cap hit
        if (promo.maxUsesPerStore) {
          const used = await PromotionUsage.countDocuments({
            promotionId: promo._id,
            storeId: storeObjId,
          });
          if (used >= promo.maxUsesPerStore) return null;
        }
        return promo;
      })
    );

    res.json({ success: true, promotions: eligible.filter(Boolean) });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────
// GET /api/promotions/usage?storeId=&page=&limit=
// Store's own usage history
// ──────────────────────────────────────────────
export const getStoreUsage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.query;
    if (!storeId) return next(new AppError("storeId is required", 400));

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter = { storeId: new Types.ObjectId(storeId as string) };
    const [usages, totalCount] = await Promise.all([
      PromotionUsage.find(filter)
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("promotionId", "name code type value"),
      PromotionUsage.countDocuments(filter),
    ]);

    res.json({
      success: true,
      usages,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
    });
  } catch (err) {
    next(err);
  }
};

// ──────────────────────────────────────────────
// POST /api/admin/promotions/apply
// Admin applies a promo to an existing order
// Body: { promotionId?, code?, storeId, orderId }
// ──────────────────────────────────────────────
export const applyPromoToOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { promotionId, code, storeId, orderId } = req.body;
    if ((!promotionId && !code) || !storeId || !orderId) {
      return next(new AppError("promotionId or code, storeId, and orderId are required", 400));
    }

    const order = await Order.findById(orderId);
    if (!order) return next(new AppError("Order not found", 404));

    let promo;
    if (promotionId) {
      promo = await Promotion.findById(promotionId);
      if (!promo || promo.status !== "active")
        return next(new AppError("Promotion not found or inactive", 400));
    } else {
      promo = await findEligiblePromotion(code, storeId, order.total ?? 0);
      if (!promo) return next(new AppError("Invalid or ineligible promo code", 400));
    }

    const orderTotal = order.total ?? 0;
    const discount = computeDiscount(promo.type, promo.value, orderTotal);

    // Update order
    (order as any).discount = discount;
    (order as any).discountType = promo.type;
    (order as any).discountValue = promo.value;
    (order as any).total = parseFloat((orderTotal - discount).toFixed(2));
    (order as any).promotionId = promo._id;
    (order as any).promotionCode = promo.code ?? null;
    await order.save();

    // Record usage
    await PromotionUsage.create({
      promotionId: promo._id,
      storeId: new Types.ObjectId(storeId),
      orderId: new Types.ObjectId(orderId),
      discountAmount: discount,
      appliedBy: "admin",
    });

    // Increment usage counter
    await Promotion.findByIdAndUpdate(promo._id, { $inc: { usedCount: 1 } });

    res.json({ success: true, discount, order });
  } catch (err) {
    next(err);
  }
};
