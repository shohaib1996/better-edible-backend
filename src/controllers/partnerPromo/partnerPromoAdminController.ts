import { Types } from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { PartnerPromotion } from "../../models/PartnerPromotion";
import { PartnerPromoClaim } from "../../models/PartnerPromoClaim";
import { PartnerProposal } from "../../models/PartnerProposal";
import { StoreCredit } from "../../models/StoreCredit";

// GET /api/admin/partner-promos
export const adminGetPromos = asyncHandler(async (_req, res) => {
  const promos = await PartnerPromotion.find().sort({ createdAt: -1 });
  res.json({ success: true, promos });
});

// POST /api/admin/partner-promos
export const adminCreatePromo = asyncHandler(async (req, res) => {
  const { title, description, discountPercent, startDate, endDate, allProducts, isOpen } = req.body;
  if (!title || discountPercent === undefined || !startDate || !endDate) {
    throw new AppError("title, discountPercent, startDate, endDate are required", 400);
  }

  const promo = await PartnerPromotion.create({
    title,
    description,
    discountPercent: Number(discountPercent),
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    allProducts: allProducts !== false,
    isOpen: isOpen !== false,
  });

  res.status(201).json({ success: true, promo });
});

// PUT /api/admin/partner-promos/:id
export const adminUpdatePromo = asyncHandler(async (req, res) => {
  const promo = await PartnerPromotion.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!promo) throw new AppError("Promotion not found", 404);
  res.json({ success: true, promo });
});

// DELETE /api/admin/partner-promos/:id
export const adminDeletePromo = asyncHandler(async (req, res) => {
  const promo = await PartnerPromotion.findByIdAndDelete(req.params.id);
  if (!promo) throw new AppError("Promotion not found", 404);
  res.json({ success: true });
});

// GET /api/admin/partner-promos/claims?status=pending|approved|rejected
export const adminGetClaims = asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.status) filter.status = req.query.status;

  const claims = await PartnerPromoClaim.find(filter)
    .populate("promoId", "title discountPercent")
    .sort({ createdAt: -1 });

  res.json({ success: true, claims });
});

// POST /api/admin/partner-promos/claims/:id/approve   body: { note? }
export const adminApproveClaim = asyncHandler(async (req, res) => {
  const claim = await PartnerPromoClaim.findById(req.params.id);
  if (!claim) throw new AppError("Claim not found", 404);
  if (claim.status !== "pending") throw new AppError("Claim is not pending", 400);

  claim.status = "approved";
  if (req.body.note) claim.adminNote = req.body.note;
  await claim.save();

  // credit the store
  let creditDoc = await StoreCredit.findOne({ store: claim.storeId });
  if (!creditDoc) {
    creditDoc = new StoreCredit({ store: claim.storeId, balance: 0, transactions: [] });
  }
  creditDoc.balance = parseFloat((creditDoc.balance + claim.creditEarned).toFixed(2));
  creditDoc.transactions.push({
    type: "earned",
    amount: claim.creditEarned,
    ref: (claim._id as Types.ObjectId).toString(),
    note: "Promo sales claim approved",
    createdAt: new Date(),
  });
  await creditDoc.save();

  res.json({ success: true, claim, newBalance: creditDoc.balance });
});

// POST /api/admin/partner-promos/claims/:id/reject   body: { note? }
export const adminRejectClaim = asyncHandler(async (req, res) => {
  const claim = await PartnerPromoClaim.findById(req.params.id);
  if (!claim) throw new AppError("Claim not found", 404);
  if (claim.status !== "pending") throw new AppError("Claim is not pending", 400);

  claim.status = "rejected";
  if (req.body.note) claim.adminNote = req.body.note;
  await claim.save();

  res.json({ success: true, claim });
});

// GET /api/admin/partner-promos/proposals?status=pending|approved|rejected
export const adminGetProposals = asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.status) filter.status = req.query.status;

  const proposals = await PartnerProposal.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, proposals });
});

// POST /api/admin/partner-promos/proposals/:id/approve   body: { note? }
export const adminApproveProposal = asyncHandler(async (req, res) => {
  const proposal = await PartnerProposal.findById(req.params.id);
  if (!proposal) throw new AppError("Proposal not found", 404);

  proposal.status = "approved";
  if (req.body.note) proposal.adminNote = req.body.note;
  await proposal.save();

  res.json({ success: true, proposal });
});

// POST /api/admin/partner-promos/proposals/:id/reject   body: { note? }
export const adminRejectProposal = asyncHandler(async (req, res) => {
  const proposal = await PartnerProposal.findById(req.params.id);
  if (!proposal) throw new AppError("Proposal not found", 404);

  proposal.status = "rejected";
  if (req.body.note) proposal.adminNote = req.body.note;
  await proposal.save();

  res.json({ success: true, proposal });
});
