import { Types } from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { PartnerPromotion } from "../../models/PartnerPromotion";
import { PartnerPromoEnrollment } from "../../models/PartnerPromoEnrollment";
import { PartnerPromoClaim } from "../../models/PartnerPromoClaim";
import { PartnerProposal } from "../../models/PartnerProposal";

// GET /api/store/promotions?storeId=
export const getStorePromos = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) throw new AppError("storeId is required", 400);

  const storeObjId = new Types.ObjectId(storeId as string);
  const promos = await PartnerPromotion.find().sort({ startDate: -1 });

  const promoIds = promos.map((p) => p._id);
  const [enrollments, claims] = await Promise.all([
    PartnerPromoEnrollment.find({ storeId: storeObjId, promoId: { $in: promoIds } }),
    PartnerPromoClaim.find({ storeId: storeObjId, promoId: { $in: promoIds } }),
  ]);

  const enrolledSet = new Set(enrollments.map((e) => e.promoId.toString()));
  const claimMap = new Map(claims.map((c) => [c.promoId.toString(), c]));

  const promotions = promos.map((promo) => {
    const id = (promo._id as Types.ObjectId).toString();
    const claim = claimMap.get(id);
    return {
      ...promo.toObject(),
      enrolled: enrolledSet.has(id),
      claim: claim ? { status: claim.status, creditEarned: claim.creditEarned } : null,
    };
  });

  res.json({ success: true, promotions });
});

// GET /api/store/promotions/my-proposals?storeId=
export const getMyProposals = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) throw new AppError("storeId is required", 400);

  const proposals = await PartnerProposal.find({
    storeId: new Types.ObjectId(storeId as string),
  }).sort({ createdAt: -1 });

  res.json({ success: true, proposals });
});

// POST /api/store/promotions/:id/enroll   body: { storeId }
export const enrollInPromo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { storeId } = req.body;
  if (!storeId) throw new AppError("storeId is required", 400);

  const promo = await PartnerPromotion.findById(id);
  if (!promo) throw new AppError("Promotion not found", 404);
  if (!promo.isOpen) throw new AppError("This promotion is not open for enrollment", 400);

  const storeObjId = new Types.ObjectId(storeId);

  const existing = await PartnerPromoEnrollment.findOne({
    promoId: promo._id,
    storeId: storeObjId,
  });
  if (existing) return res.json({ success: true, enrolled: true });

  await PartnerPromoEnrollment.create({ promoId: promo._id, storeId: storeObjId });
  res.json({ success: true, enrolled: true });
});

// POST /api/store/promotions/:id/claim
// body: { storeId, items: [{ productName, unitsSold, unitPrice }] }
export const submitClaim = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { storeId, items } = req.body;
  if (!storeId) throw new AppError("storeId is required", 400);
  if (!Array.isArray(items) || items.length === 0) throw new AppError("items are required", 400);

  const storeObjId = new Types.ObjectId(storeId);
  const promo = await PartnerPromotion.findById(id);
  if (!promo) throw new AppError("Promotion not found", 404);

  const enrollment = await PartnerPromoEnrollment.findOne({
    promoId: promo._id,
    storeId: storeObjId,
  });
  if (!enrollment)
    throw new AppError("You must enroll in this promotion before submitting a claim", 400);

  const existingClaim = await PartnerPromoClaim.findOne({
    promoId: promo._id,
    storeId: storeObjId,
  });
  if (existingClaim)
    throw new AppError("A claim has already been submitted for this promotion", 400);

  const validItems = items.filter(
    (r: any) =>
      r.productName &&
      typeof r.unitsSold === "number" &&
      r.unitsSold >= 0 &&
      typeof r.unitPrice === "number" &&
      r.unitPrice >= 0
  );
  if (validItems.length === 0) throw new AppError("No valid items provided", 400);

  const totalSales = parseFloat(
    validItems.reduce((sum: number, r: any) => sum + r.unitsSold * r.unitPrice, 0).toFixed(2)
  );
  const creditEarned = parseFloat(((totalSales * promo.discountPercent) / 100).toFixed(2));

  const claim = await PartnerPromoClaim.create({
    promoId: promo._id,
    storeId: storeObjId,
    items: validItems,
    totalSales,
    creditEarned,
    status: "pending",
  });

  res.json({ success: true, claim });
});

// POST /api/store/promotions/propose
// body: { storeId, storeName, title, description?, proposedDiscount, proposedStartDate, proposedEndDate, notes? }
export const submitProposal = asyncHandler(async (req, res) => {
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

  if (
    !storeId ||
    !storeName ||
    !title ||
    proposedDiscount === undefined ||
    !proposedStartDate ||
    !proposedEndDate
  ) {
    throw new AppError(
      "storeId, storeName, title, proposedDiscount, proposedStartDate, proposedEndDate are required",
      400
    );
  }

  const proposal = await PartnerProposal.create({
    storeId: new Types.ObjectId(storeId),
    storeName,
    title,
    description,
    proposedDiscount: Number(proposedDiscount),
    proposedStartDate: new Date(proposedStartDate),
    proposedEndDate: new Date(proposedEndDate),
    notes,
    status: "pending",
  });

  res.json({ success: true, proposal });
});
