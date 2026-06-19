import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import PartnershipEnrollment from "../../models/PartnershipEnrollment";
import { Store } from "../../models/Store";
import { AppError } from "../../utils/AppError";

// POST /api/partnership/join
export const joinPartnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.body;

    const existing = await PartnershipEnrollment.findOne({
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

    const enrollment = await PartnershipEnrollment.create({
      storeId: new Types.ObjectId(storeId),
      status: "pending_approval",
      requestedAt: new Date(),
    });

    res.status(201).json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
};

// GET /api/partnership/status?storeId=
export const getPartnershipStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.query;
    if (!storeId) return next(new AppError("storeId is required", 400));

    const enrollment = await PartnershipEnrollment.findOne({
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

// POST /api/admin/partnership/:storeId/approve
export const approvePartnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.params;
    const { notes, approvedBy } = req.body;

    const enrollment = await PartnershipEnrollment.findOne({
      storeId: new Types.ObjectId(storeId),
    });
    if (!enrollment) return next(new AppError("Enrollment not found", 404));

    enrollment.status = "pending_setup";
    enrollment.posApiKey = crypto.randomBytes(32).toString("hex");
    enrollment.approvedAt = new Date();
    enrollment.approvedBy = approvedBy || "admin";
    if (notes) enrollment.notes = notes;

    await enrollment.save();
    res.json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/partnership/:storeId/reject
export const rejectPartnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.params;
    const { notes } = req.body;

    const enrollment = await PartnershipEnrollment.findOne({
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

// GET /api/admin/partnership
export const getAllPartnershipStores = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;

    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [enrollments, totalCount] = await Promise.all([
      PartnershipEnrollment.find(filter)
        .populate("storeId", "name city state")
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limit),
      PartnershipEnrollment.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;
    res.json({ success: true, stores: enrollments, totalCount, totalPages, currentPage: page });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/partnership/:storeId
export const getStorePartnershipDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.params;

    const enrollment = await PartnershipEnrollment.findOne({
      storeId: new Types.ObjectId(storeId),
    }).populate("storeId", "name city state email");

    if (!enrollment) {
      return res.json({ success: true, enrollment: null, status: "not_enrolled" });
    }

    const store = await Store.findById(storeId).select("name city state email");

    res.json({ success: true, enrollment, store });
  } catch (err) {
    next(err);
  }
};
