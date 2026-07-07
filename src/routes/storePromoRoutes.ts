import { Router } from "express";
import {
  adminGetPromos,
  adminCreatePromo,
  adminUpdatePromo,
  adminDeletePromo,
  adminGetClaims,
  adminApproveClaim,
  adminRejectClaim,
  adminGetProposals,
  adminApproveProposal,
  adminRejectProposal,
  adminGetAllCredits,
  adminGetEnrollments,
  getActivePromos,
  enrollInPromo,
  submitSalesClaim,
  submitPromoProposal,
  getStoreProposals,
  getStoreCredits,
  applyCredit,
} from "../controllers/promotions/storePromoController";

const router = Router();

// ── Admin routes — mounted at /api/admin/store-promotions ──────────────────
router.get("/admin/store-promotions", adminGetPromos);
router.post("/admin/store-promotions", adminCreatePromo);
router.get("/admin/store-promotions/credits", adminGetAllCredits);
router.get("/admin/store-promotions/enrollments", adminGetEnrollments);
router.get("/admin/store-promotions/claims", adminGetClaims);
router.patch("/admin/store-promotions/claims/:id/approve", adminApproveClaim);
router.patch("/admin/store-promotions/claims/:id/reject", adminRejectClaim);
router.get("/admin/store-promotions/proposals", adminGetProposals);
router.patch("/admin/store-promotions/proposals/:id/approve", adminApproveProposal);
router.patch("/admin/store-promotions/proposals/:id/reject", adminRejectProposal);
router.patch("/admin/store-promotions/:id", adminUpdatePromo);
router.delete("/admin/store-promotions/:id", adminDeletePromo);

// ── Store routes — mounted at /api/store/store-promotions ──────────────────
router.get("/store/store-promotions", getActivePromos);
router.post("/store/store-promotions/propose", submitPromoProposal);
router.get("/store/store-promotions/my-proposals", getStoreProposals);
router.get("/store/store-promotions/credits", getStoreCredits);
router.post("/store/store-promotions/credits/apply", applyCredit);
router.post("/store/store-promotions/:id/enroll", enrollInPromo);
router.post("/store/store-promotions/:id/claim", submitSalesClaim);

export default router;
