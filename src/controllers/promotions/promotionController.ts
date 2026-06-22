import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import Promotion from "../../models/Promotion";
import { AppError } from "../../utils/AppError";

// GET /api/promotions/available?page=&limit=
export const getAvailablePromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter = { status: "active", isPublic: true };

    const [promotions, totalCount] = await Promise.all([
      Promotion.find(filter).sort({ startDate: -1 }).skip(skip).limit(limit),
      Promotion.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;
    res.json({ success: true, promotions, totalCount, totalPages, currentPage: page });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/promotions?page=&limit=&status=
export const getAdminPromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [promotions, totalCount] = await Promise.all([
      Promotion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Promotion.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;
    res.json({ success: true, promotions, totalCount, totalPages, currentPage: page });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/promotions
export const createPromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name, description, productId, productName, sku,
      creditRatePerUnit, startDate, endDate, status, isPublic,
    } = req.body;

    const promotion = await Promotion.create({
      name,
      description,
      productId: new Types.ObjectId(productId),
      productName,
      sku,
      creditRatePerUnit,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status ?? "draft",
      isPublic: isPublic ?? false,
    });

    res.status(201).json({ success: true, promotion });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/promotions/:id
export const updatePromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates: Record<string, any> = { ...req.body };

    if (updates.productId) updates.productId = new Types.ObjectId(updates.productId);
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);

    const promotion = await Promotion.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!promotion) return next(new AppError("Promotion not found", 404));

    res.json({ success: true, promotion });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/promotions/:id
export const deletePromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findByIdAndDelete(id);
    if (!promotion) return next(new AppError("Promotion not found", 404));

    res.json({ success: true, message: "Promotion deleted" });
  } catch (err) {
    next(err);
  }
};
