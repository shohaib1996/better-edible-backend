import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import PartnershipBill from "../../models/PartnershipBill";
import PartnershipSale from "../../models/PartnershipSale";
import PartnershipInventory from "../../models/PartnershipInventory";
import { AppError } from "../../utils/AppError";

// GET /api/partnership/billing?storeId=
// GET /api/admin/partnership/:storeId/billing
export const getBilling = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = (req.params.storeId || req.query.storeId) as string;
    if (!storeId) return next(new AppError("storeId is required", 400));

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const filter = { storeId: new Types.ObjectId(storeId) };
    const [bills, totalCount] = await Promise.all([
      PartnershipBill.find(filter).sort({ billingYear: -1, billingMonth: -1 }).skip(skip).limit(limit),
      PartnershipBill.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;
    res.json({ success: true, bills, totalCount, totalPages, currentPage: page });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/partnership/:storeId/billing/generate
export const generateBill = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.params;
    const { year, month } = req.body;

    const existing = await PartnershipBill.findOne({
      storeId: new Types.ObjectId(storeId),
      billingYear: year,
      billingMonth: month,
    });
    if (existing) return next(new AppError("Bill already exists for this period", 400));

    // Date range for the billing month
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    // Aggregate sales for this store in this month grouped by productId
    const salesAgg = await PartnershipSale.aggregate([
      {
        $match: {
          storeId: new Types.ObjectId(storeId),
          date: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$productId",
          unitsSold: { $sum: "$unitsSold" },
          sku: { $first: "$sku" },
        },
      },
    ]);

    if (salesAgg.length === 0) {
      return next(new AppError("No sales data found for this period", 400));
    }

    const lineItems = await Promise.all(
      salesAgg.map(async (s) => {
        const inventory = await PartnershipInventory.findOne({
          storeId: new Types.ObjectId(storeId),
          productId: s._id,
        });

        const wholesalePrice = inventory?.wholesalePrice ?? 0;
        const productName = inventory?.productName ?? "Unknown Product";
        const sku = inventory?.sku ?? s.sku;
        const lineTotal = s.unitsSold * wholesalePrice;

        return {
          productId: s._id,
          productName,
          sku,
          unitsSold: s.unitsSold,
          wholesalePrice,
          lineTotal,
        };
      })
    );

    const subtotal = lineItems.reduce((sum, li) => sum + li.lineTotal, 0);

    const bill = await PartnershipBill.create({
      storeId: new Types.ObjectId(storeId),
      billingYear: year,
      billingMonth: month,
      lineItems,
      subtotal,
      credits: [],
      creditsTotal: 0,
      total: subtotal,
      status: "draft",
      generatedAt: new Date(),
    });

    res.status(201).json({ success: true, bill });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/partnership/billing/:billId/credit
export const applyCredit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { billId } = req.params;
    const { amount, reason } = req.body;

    const bill = await PartnershipBill.findById(billId);
    if (!bill) return next(new AppError("Bill not found", 404));

    bill.credits.push({ amount, reason, appliedAt: new Date() });
    bill.creditsTotal = bill.credits.reduce((sum, c) => sum + c.amount, 0);
    bill.total = bill.subtotal - bill.creditsTotal;

    await bill.save();
    res.json({ success: true, bill });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/partnership/billing/:billId/status
export const updateBillStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { billId } = req.params;
    const { status } = req.body;

    const bill = await PartnershipBill.findById(billId);
    if (!bill) return next(new AppError("Bill not found", 404));

    bill.status = status;
    if (status === "paid") bill.paidAt = new Date();

    await bill.save();
    res.json({ success: true, bill });
  } catch (err) {
    next(err);
  }
};
