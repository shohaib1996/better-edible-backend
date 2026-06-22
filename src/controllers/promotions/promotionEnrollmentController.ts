import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import PromotionEnrollment from "../../models/PromotionEnrollment";
import { AppError } from "../../utils/AppError";

// POST /api/promotions/enroll
export const enrollInPromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.body;

    const existing = await PromotionEnrollment.findOne({
      storeId: new Types.ObjectId(storeId),
    });

    if (existing && existing.status !== "rejected") {
      return next(new AppError("Already enrolled or pending approval", 400));
    }

    if (existing && existing.status === "rejected") {
      existing.status = "pending_approval";
      existing.requestedAt = new Date();
      existing.notes = undefined;
      await existing.save();
      return res.status(200).json({ success: true, enrollment: existing });
    }

    const enrollment = await PromotionEnrollment.create({
      storeId: new Types.ObjectId(storeId),
      status: "pending_approval",
      requestedAt: new Date(),
    });

    res.status(201).json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
};

// GET /api/promotions/status?storeId=
export const getPromotionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.query;
    if (!storeId) return next(new AppError("storeId is required", 400));

    const enrollment = await PromotionEnrollment.findOne({
      storeId: new Types.ObjectId(storeId as string),
    });

    if (!enrollment) {
      return res.json({ success: true, enrollment: null, status: "not_enrolled" });
    }

    res.json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/promotions/enrollments
export const getAllPromotionEnrollments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [enrollments, totalCount] = await Promise.all([
      PromotionEnrollment.find(filter)
        .populate("storeId", "name city state")
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit),
      PromotionEnrollment.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;
    res.json({ success: true, enrollments, totalCount, totalPages, currentPage: page });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/promotions/enrollments/:storeId/approve
export const approvePromotionEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.params;
    const { notes, approvedBy } = req.body;

    const enrollment = await PromotionEnrollment.findOne({
      storeId: new Types.ObjectId(storeId),
    });
    if (!enrollment) return next(new AppError("Enrollment not found", 404));

    enrollment.status = "active";
    enrollment.approvedAt = new Date();
    enrollment.approvedBy = approvedBy || "admin";
    if (notes) enrollment.notes = notes;

    await enrollment.save();
    res.json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/promotions/enrollments/:storeId/reject
export const rejectPromotionEnrollment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.params;
    const { notes } = req.body;

    const enrollment = await PromotionEnrollment.findOne({
      storeId: new Types.ObjectId(storeId),
    });
    if (!enrollment) return next(new AppError("Enrollment not found", 404));

    enrollment.status = "rejected";
    if (notes) enrollment.notes = notes;

    await enrollment.save();
    res.json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
};
