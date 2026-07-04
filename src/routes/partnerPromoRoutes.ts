import { Router } from "express";
import {
  getStorePromos,
  getMyProposals,
  enrollInPromo,
  submitClaim,
  submitProposal,
} from "../controllers/partnerPromo/partnerPromoStoreController";
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
} from "../controllers/partnerPromo/partnerPromoAdminController";

const router = Router();

// ── Store-facing (/api/store/promotions) ─────────────────────────────────────
router.get(
  "/store/promotions/my-proposals",
  getMyProposals /* #swagger.tags = ['Store - Partner Promos'] */
);
router.post(
  "/store/promotions/propose",
  submitProposal /* #swagger.tags = ['Store - Partner Promos'] */
);
router.get("/store/promotions", getStorePromos /* #swagger.tags = ['Store - Partner Promos'] */);
router.post(
  "/store/promotions/:id/enroll",
  enrollInPromo /* #swagger.tags = ['Store - Partner Promos'] */
);
router.post(
  "/store/promotions/:id/claim",
  submitClaim /* #swagger.tags = ['Store - Partner Promos'] */
);

// ── Admin (/api/admin/partner-promos) ────────────────────────────────────────
router.get(
  "/admin/partner-promos/claims",
  adminGetClaims /* #swagger.tags = ['Admin - Partner Promos'] */
);
router.post(
  "/admin/partner-promos/claims/:id/approve",
  adminApproveClaim /* #swagger.tags = ['Admin - Partner Promos'] */
);
router.post(
  "/admin/partner-promos/claims/:id/reject",
  adminRejectClaim /* #swagger.tags = ['Admin - Partner Promos'] */
);
router.get(
  "/admin/partner-promos/proposals",
  adminGetProposals /* #swagger.tags = ['Admin - Partner Promos'] */
);
router.post(
  "/admin/partner-promos/proposals/:id/approve",
  adminApproveProposal /* #swagger.tags = ['Admin - Partner Promos'] */
);
router.post(
  "/admin/partner-promos/proposals/:id/reject",
  adminRejectProposal /* #swagger.tags = ['Admin - Partner Promos'] */
);
router.get(
  "/admin/partner-promos",
  adminGetPromos /* #swagger.tags = ['Admin - Partner Promos'] */
);
router.post(
  "/admin/partner-promos",
  adminCreatePromo /* #swagger.tags = ['Admin - Partner Promos'] */
);
router.put(
  "/admin/partner-promos/:id",
  adminUpdatePromo /* #swagger.tags = ['Admin - Partner Promos'] */
);
router.delete(
  "/admin/partner-promos/:id",
  adminDeletePromo /* #swagger.tags = ['Admin - Partner Promos'] */
);

export default router;
