import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import Promotion from "../../models/Promotion";
import PromotionUsage from "../../models/PromotionUsage";
import { AppError } from "../../utils/AppError";

// GET /api/admin/promotions
export const getAdminPromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const filter: Record<string, unknown> = {};
    if (status && (status === "active" || status === "inactive")) filter.status = status;

    const [promotions, totalCount] = await Promise.all([
      Promotion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Promotion.countDocuments(filter),
    ]);

    res.json({ success: true, promotions, totalCount, totalPages: Math.ceil(totalCount / limit) || 1, currentPage: page });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/promotions/:id
export const getAdminPromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) return next(new AppError("Promotion not found", 404));
    res.json({ success: true, promotion });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/promotions
export const createPromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name, code, description, type, value,
      minOrderAmount, maxUses, maxUsesPerStore,
      storeIds, startDate, endDate, status, isPublic, autoApply,
    } = req.body;

    const promotion = await Promotion.create({
      name,
      code: code ? String(code).toUpperCase().trim() : undefined,
      description,
      type,
      value,
      minOrderAmount,
      maxUses,
      maxUsesPerStore,
      storeIds: storeIds ?? [],
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status: status ?? "active",
      isPublic: isPublic ?? false,
      autoApply: autoApply ?? false,
    });

    res.status(201).json({ success: true, promotion });
  } catch (err: any) {
    if (err.code === 11000) return next(new AppError("A promotion with that code already exists", 400));
    next(err);
  }
};

// PUT /api/admin/promotions/:id
export const updatePromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name, code, description, type, value,
      minOrderAmount, maxUses, maxUsesPerStore,
      storeIds, startDate, endDate, status, isPublic, autoApply,
    } = req.body;

    const update: Record<string, unknown> = {
      name, description, type, value,
      minOrderAmount, maxUses, maxUsesPerStore,
      storeIds: storeIds ?? [],
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status, isPublic, autoApply,
    };
    if (code !== undefined) update.code = code ? String(code).toUpperCase().trim() : undefined;

    const promotion = await Promotion.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!promotion) return next(new AppError("Promotion not found", 404));

    res.json({ success: true, promotion });
  } catch (err: any) {
    if (err.code === 11000) return next(new AppError("A promotion with that code already exists", 400));
    next(err);
  }
};

// DELETE /api/admin/promotions/:id
export const deletePromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promotion = await Promotion.findByIdAndDelete(req.params.id);
    if (!promotion) return next(new AppError("Promotion not found", 404));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/promotions/:id/usage
export const getPromotionUsage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const promotionId = new Types.ObjectId(req.params.id);
    const [usages, totalCount, promotion] = await Promise.all([
      PromotionUsage.find({ promotionId })
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("storeId", "storeName")
        .populate("orderId", "orderNumber total"),
      PromotionUsage.countDocuments({ promotionId }),
      Promotion.findById(promotionId, "name usedCount"),
    ]);

    if (!promotion) return next(new AppError("Promotion not found", 404));

    const totalDiscount = await PromotionUsage.aggregate([
      { $match: { promotionId } },
      { $group: { _id: null, total: { $sum: "$discountAmount" } } },
    ]);

    res.json({
      success: true,
      promotion,
      usages,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
      currentPage: page,
      totalDiscount: totalDiscount[0]?.total ?? 0,
    });
  } catch (err) {
    next(err);
  }
};
