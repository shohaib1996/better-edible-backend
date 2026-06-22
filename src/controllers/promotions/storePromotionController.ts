import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import Promotion from "../../models/Promotion";
import StorePromotion from "../../models/StorePromotion";
import PromotionEnrollment from "../../models/PromotionEnrollment";
import { AppError } from "../../utils/AppError";

// GET /api/promotions/my?storeId=&page=&limit=
export const getMyPromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.query;
    if (!storeId) return next(new AppError("storeId is required", 400));

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter = { storeId: new Types.ObjectId(storeId as string) };

    const [storePromotions, totalCount] = await Promise.all([
      StorePromotion.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      StorePromotion.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;
    res.json({ success: true, storePromotions, totalCount, totalPages, currentPage: page });
  } catch (err) {
    next(err);
  }
};

// POST /api/promotions/join/:promotionId
export const joinCompanyPromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { promotionId } = req.params;
    const { storeId } = req.body;

    const enrollment = await PromotionEnrollment.findOne({
      storeId: new Types.ObjectId(storeId),
      status: "active",
    });
    if (!enrollment) return next(new AppError("Store is not enrolled in the promotions program", 403));

    const promotion = await Promotion.findById(promotionId);
    if (!promotion || promotion.status !== "active" || !promotion.isPublic) {
      return next(new AppError("Promotion not available", 404));
    }

    const existing = await StorePromotion.findOne({
      storeId: new Types.ObjectId(storeId),
      promotionId: new Types.ObjectId(promotionId),
    });
    if (existing) return next(new AppError("Already joined this promotion", 400));

    const storePromotion = await StorePromotion.create({
      storeId: new Types.ObjectId(storeId),
      promotionId: new Types.ObjectId(promotionId),
      type: "company",
      status: "active",
    });

    res.status(201).json({ success: true, storePromotion });
  } catch (err) {
    next(err);
  }
};

// POST /api/promotions/custom
export const createCustomPromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId, name, productId, productName, creditRatePerUnit, startDate, endDate } = req.body;

    const enrollment = await PromotionEnrollment.findOne({
      storeId: new Types.ObjectId(storeId),
      status: "active",
    });
    if (!enrollment) return next(new AppError("Store is not enrolled in the promotions program", 403));

    const storePromotion = await StorePromotion.create({
      storeId: new Types.ObjectId(storeId),
      type: "custom",
      name,
      productId: new Types.ObjectId(productId),
      productName,
      creditRatePerUnit,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "active",
    });

    res.status(201).json({ success: true, storePromotion });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/promotions/stores/:storeId
export const getAdminStorePromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.params;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter = { storeId: new Types.ObjectId(storeId) };

    const [storePromotions, totalCount, enrollment] = await Promise.all([
      StorePromotion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      StorePromotion.countDocuments(filter),
      PromotionEnrollment.findOne({ storeId: new Types.ObjectId(storeId) }),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;
    res.json({ success: true, storePromotions, enrollment, totalCount, totalPages, currentPage: page });
  } catch (err) {
    next(err);
  }
};
