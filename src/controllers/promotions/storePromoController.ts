import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { AppError } from "../../utils/AppError";
import { StorePromotion } from "../../models/StorePromotion";
import { StorePromoProposal } from "../../models/StorePromoProposal";
import { StorePromoEnrollment } from "../../models/StorePromoEnrollment";
import { StorePromoSalesClaim } from "../../models/StorePromoSalesClaim";
import { StoreCredit } from "../../models/StoreCredit";
import { Order } from "../../models/Order";

// ─────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET /api/admin/store-promotions
export const adminGetPromos = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const promos = await StorePromotion.find().sort({ createdAt: -1 });
    const enrollments = await StorePromoEnrollment.find({ promotion: { $in: promos.map((p) => p._id) } });
    const countMap: Record<string, number> = {};
    enrollments.forEach((e) => {
      const key = e.promotion.toString();
      countMap[key] = (countMap[key] || 0) + 1;
    });
    const result = promos.map((p) => ({
      ...p.toObject(),
      enrollmentCount: countMap[p.id as string] || 0,
    }));
    res.json({ success: true, promotions: result });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/store-promotions/enrollments
export const adminGetEnrollments = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollments = await StorePromoEnrollment.find()
      .populate("store", "storeName email")
      .populate("promotion", "title discountPercent")
      .sort({ enrolledAt: -1 });
    res.json({ success: true, enrollments });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/store-promotions
export const adminCreatePromo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, discountPercent, startDate, endDate, allProducts, isOpen } = req.body;

    if (!title) return next(new AppError("title is required", 400));
    if (!discountPercent || discountPercent <= 0 || discountPercent > 100)
      return next(new AppError("discountPercent must be between 1 and 100", 400));
    if (!startDate || !endDate)
      return next(new AppError("startDate and endDate are required", 400));

    const promo = await StorePromotion.create({
      title,
      description,
      discountPercent: parseFloat(discountPercent),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      allProducts: allProducts !== false,
      isOpen: isOpen !== false,
    });

    res.status(201).json({ success: true, promotion: promo });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/store-promotions/:id
export const adminUpdatePromo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const promo = await StorePromotion.findByIdAndUpdate(id, req.body, { new: true });
    if (!promo) return next(new AppError("Promotion not found", 404));
    res.json({ success: true, promotion: promo });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/store-promotions/:id
export const adminDeletePromo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const promo = await StorePromotion.findByIdAndDelete(id);
    if (!promo) return next(new AppError("Promotion not found", 404));
    res.json({ success: true, message: "Promotion deleted" });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/store-promotions/claims
export const adminGetClaims = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const claims = await StorePromoSalesClaim.find(filter)
      .populate("promotion", "title discountPercent")
      .populate("store", "storeName name")
      .sort({ createdAt: -1 });
    res.json({ success: true, claims });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/store-promotions/claims/:id/approve
export const adminApproveClaim = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const claim = await StorePromoSalesClaim.findById(id);
    if (!claim) return next(new AppError("Claim not found", 404));
    if (claim.status !== "pending") return next(new AppError("Claim is not pending", 400));

    claim.status = "approved";
    claim.reviewedAt = new Date();
    if (note) claim.note = note;
    await claim.save();

    // Issue credit to the store
    let credit = await StoreCredit.findOne({ store: claim.store });
    if (!credit) {
      credit = new StoreCredit({ store: claim.store, balance: 0, transactions: [] });
    }
    credit.balance = parseFloat((credit.balance + claim.creditEarned).toFixed(2));
    credit.transactions.push({
      type: "earned",
      amount: claim.creditEarned,
      ref: claim.id as string,
      note: "Promo claim approved",
      createdAt: new Date(),
    });
    await credit.save();

    res.json({ success: true, claim, newBalance: credit.balance });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/store-promotions/claims/:id/reject
export const adminRejectClaim = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const claim = await StorePromoSalesClaim.findById(id);
    if (!claim) return next(new AppError("Claim not found", 404));
    if (claim.status !== "pending") return next(new AppError("Claim is not pending", 400));

    claim.status = "rejected";
    claim.reviewedAt = new Date();
    if (note) claim.note = note;
    await claim.save();

    res.json({ success: true, claim });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/store-promotions/proposals
export const adminGetProposals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const proposals = await StorePromoProposal.find(filter)
      .populate("store", "storeName name")
      .sort({ createdAt: -1 });
    res.json({ success: true, proposals });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/store-promotions/proposals/:id/approve
export const adminApproveProposal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { adminNote, discountPercent, startDate, endDate } = req.body;

    const proposal = await StorePromoProposal.findById(id);
    if (!proposal) return next(new AppError("Proposal not found", 404));
    if (proposal.status !== "pending") return next(new AppError("Proposal is not pending", 400));

    // Create the actual promotion (admin can override terms)
    const promo = await StorePromotion.create({
      title: proposal.title,
      description: proposal.description,
      discountPercent: discountPercent || proposal.proposedDiscount,
      startDate: startDate ? new Date(startDate) : proposal.proposedStartDate,
      endDate: endDate ? new Date(endDate) : proposal.proposedEndDate,
      allProducts: true,
      isOpen: true,
    });

    proposal.status = "approved";
    proposal.reviewedAt = new Date();
    proposal.adminNote = adminNote;
    proposal.createdPromotion = promo._id as Types.ObjectId;
    await proposal.save();

    res.json({ success: true, proposal, promotion: promo });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/store-promotions/proposals/:id/reject
export const adminRejectProposal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const proposal = await StorePromoProposal.findById(id);
    if (!proposal) return next(new AppError("Proposal not found", 404));
    if (proposal.status !== "pending") return next(new AppError("Proposal is not pending", 400));

    proposal.status = "rejected";
    proposal.reviewedAt = new Date();
    proposal.adminNote = adminNote;
    await proposal.save();

    res.json({ success: true, proposal });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/store-promotions/credits
export const adminGetAllCredits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const credits = await StoreCredit.find().populate("store", "storeName name email");
    res.json({ success: true, credits });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// STORE ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET /api/store/store-promotions?storeId=
export const getActivePromos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.query;
    const now = new Date();

    const promos = await StorePromotion.find({
      isOpen: true,
      endDate: { $gte: now },
    }).sort({ startDate: 1 });

    if (!storeId) {
      return res.json({ success: true, promotions: promos });
    }

    const storeObjId = new Types.ObjectId(storeId as string);
    const [enrollments, claims] = await Promise.all([
      StorePromoEnrollment.find({ store: storeObjId }),
      StorePromoSalesClaim.find({ store: storeObjId }),
    ]);

    const enrolledIds = new Set(enrollments.map((e) => e.promotion.toString()));
    const claimsMap: Record<string, { status: string; creditEarned: number }> = {};
    claims.forEach((c) => {
      claimsMap[c.promotion.toString()] = { status: c.status, creditEarned: c.creditEarned };
    });

    const result = promos.map((p) => ({
      ...p.toObject(),
      enrolled: enrolledIds.has(p.id as string),
      claim: claimsMap[p.id as string] ?? null,
    }));

    res.json({ success: true, promotions: result });
  } catch (err) {
    next(err);
  }
};

// POST /api/store/store-promotions/:id/enroll
export const enrollInPromo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.body;
    const { id } = req.params;

    if (!storeId) return next(new AppError("storeId is required", 400));

    const promo = await StorePromotion.findById(id);
    if (!promo) return next(new AppError("Promotion not found", 404));
    if (!promo.isOpen) return next(new AppError("This promotion is not open for enrollment", 400));
    if (new Date() > promo.endDate) return next(new AppError("This promotion has ended", 400));

    const enrollment = await StorePromoEnrollment.findOneAndUpdate(
      { promotion: promo._id, store: new Types.ObjectId(storeId) },
      { promotion: promo._id, store: new Types.ObjectId(storeId), enrolledAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true, enrollment });
  } catch (err) {
    next(err);
  }
};

// POST /api/store/store-promotions/:id/claim
export const submitSalesClaim = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId, items } = req.body;
    const { id } = req.params;

    if (!storeId) return next(new AppError("storeId is required", 400));
    if (!items || !Array.isArray(items) || items.length === 0)
      return next(new AppError("items array is required", 400));

    const promo = await StorePromotion.findById(id);
    if (!promo) return next(new AppError("Promotion not found", 404));

    const storeObjId = new Types.ObjectId(storeId);

    const enrollment = await StorePromoEnrollment.findOne({ promotion: promo._id, store: storeObjId });
    if (!enrollment)
      return next(new AppError("You must enroll in this promotion before submitting a claim", 400));

    const existingClaim = await StorePromoSalesClaim.findOne({ promotion: promo._id, store: storeObjId });
    if (existingClaim)
      return next(new AppError("You have already submitted a claim for this promotion", 400));

    let totalSalesValue = 0;
    const claimItems: {
      product?: Types.ObjectId;
      productName: string;
      unitsSold: number;
      unitPrice: number;
      lineTotal: number;
    }[] = [];

    for (const item of items) {
      const unitsSold = parseInt(item.unitsSold, 10);
      const unitPrice = parseFloat(item.unitPrice);
      if (!unitsSold || unitsSold < 1) return next(new AppError("unitsSold must be at least 1", 400));
      if (!unitPrice || unitPrice <= 0) return next(new AppError("unitPrice must be positive", 400));
      const lineTotal = parseFloat((unitsSold * unitPrice).toFixed(2));
      totalSalesValue += lineTotal;
      claimItems.push({
        product: item.productId ? new Types.ObjectId(item.productId) : undefined,
        productName: item.productName || "Unknown Product",
        unitsSold,
        unitPrice,
        lineTotal,
      });
    }

    const creditEarned = parseFloat(((totalSalesValue * promo.discountPercent) / 100).toFixed(2));
    const claim = await StorePromoSalesClaim.create({
      promotion: promo._id,
      store: storeObjId,
      items: claimItems,
      totalSalesValue: parseFloat(totalSalesValue.toFixed(2)),
      creditEarned,
      status: "pending",
    });

    res.status(201).json({ success: true, claim });
  } catch (err) {
    next(err);
  }
};

// POST /api/store/store-promotions/propose
export const submitPromoProposal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      storeId,
      storeName,
      title,
      description,
      proposedDiscount,
      proposedStartDate,
      proposedEndDate,
      notes,
    } = req.body;

    if (!storeId) return next(new AppError("storeId is required", 400));
    if (!title) return next(new AppError("title is required", 400));
    if (!proposedDiscount || proposedDiscount <= 0 || proposedDiscount > 100)
      return next(new AppError("proposedDiscount must be between 1 and 100", 400));
    if (!proposedStartDate || !proposedEndDate)
      return next(new AppError("proposedStartDate and proposedEndDate are required", 400));

    const proposal = await StorePromoProposal.create({
      store: new Types.ObjectId(storeId),
      storeName,
      title,
      description,
      proposedDiscount: parseFloat(proposedDiscount),
      proposedStartDate: new Date(proposedStartDate),
      proposedEndDate: new Date(proposedEndDate),
      notes,
      status: "pending",
    });

    res.status(201).json({ success: true, proposal });
  } catch (err) {
    next(err);
  }
};

// GET /api/store/store-promotions/my-proposals?storeId=
export const getStoreProposals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.query;
    if (!storeId) return next(new AppError("storeId is required", 400));

    const proposals = await StorePromoProposal.find({
      store: new Types.ObjectId(storeId as string),
    }).sort({ createdAt: -1 });

    res.json({ success: true, proposals });
  } catch (err) {
    next(err);
  }
};

// GET /api/store/store-promotions/credits?storeId=
export const getStoreCredits = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId } = req.query;
    if (!storeId) return next(new AppError("storeId is required", 400));

    const credit = await StoreCredit.findOne({ store: new Types.ObjectId(storeId as string) });
    res.json({
      success: true,
      balance: credit?.balance ?? 0,
      transactions: credit?.transactions ?? [],
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/store/store-promotions/credits/apply
export const applyCredit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId, orderId, amount } = req.body;
    if (!storeId) return next(new AppError("storeId is required", 400));
    if (!orderId) return next(new AppError("orderId is required", 400));
    if (!amount || amount <= 0) return next(new AppError("amount must be positive", 400));

    const storeObjId = new Types.ObjectId(storeId);
    const credit = await StoreCredit.findOne({ store: storeObjId });
    if (!credit || credit.balance < amount)
      return next(new AppError("Insufficient credit balance", 400));

    credit.balance = parseFloat((credit.balance - amount).toFixed(2));
    credit.transactions.push({
      type: "applied",
      amount,
      ref: orderId,
      note: `Applied to order`,
      createdAt: new Date(),
    });
    await credit.save();

    const order = await Order.findById(orderId);
    if (order) {
      (order as any).discount = parseFloat((((order as any).discount || 0) + amount).toFixed(2));
      order.total = parseFloat(Math.max(0, order.total - amount).toFixed(2));
      order.note = (order.note ? order.note + " | " : "") + `Credit applied: $${amount.toFixed(2)}`;
      await order.save();
    }

    res.json({ success: true, newBalance: credit.balance });
  } catch (err) {
    next(err);
  }
};
