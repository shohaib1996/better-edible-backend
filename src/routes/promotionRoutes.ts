import { Router } from "express";
import { validate } from "../middleware/validate";

import {
  enrollInPromotions,
  getPromotionStatus,
  getAllPromotionEnrollments,
  approvePromotionEnrollment,
  rejectPromotionEnrollment,
} from "../controllers/promotions/promotionEnrollmentController";

import {
  getAvailablePromotions,
  getAdminPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from "../controllers/promotions/promotionController";

import {
  getMyPromotions,
  joinCompanyPromotion,
  createCustomPromotion,
  getAdminStorePromotions,
} from "../controllers/promotions/storePromotionController";

import {
  logPromotionSales,
} from "../controllers/promotions/promotionSalesController";

import {
  getPromotionCredits,
  applyPromotionCredit,
} from "../controllers/promotions/promotionCreditController";

import {
  enrollInPromotionsSchema,
  approvePromotionEnrollmentSchema,
  rejectPromotionEnrollmentSchema,
  createPromotionSchema,
  updatePromotionSchema,
  joinCompanyPromotionSchema,
  createCustomPromotionSchema,
  logPromotionSalesSchema,
  applyPromotionCreditSchema,
} from "../validators/promotionSchemas";

const router = Router();

// ── Store-facing routes ───────────────────────────────────────────────────────

router.post(
  "/promotions/enroll",
  validate({ body: enrollInPromotionsSchema }),
  enrollInPromotions
);
router.get("/promotions/status", getPromotionStatus);
router.get("/promotions/available", getAvailablePromotions);
router.get("/promotions/my", getMyPromotions);

router.post(
  "/promotions/join/:promotionId",
  validate({ body: joinCompanyPromotionSchema }),
  joinCompanyPromotion
);

router.post(
  "/promotions/custom",
  validate({ body: createCustomPromotionSchema }),
  createCustomPromotion
);

router.post(
  "/promotions/sales/:storePromotionId",
  validate({ body: logPromotionSalesSchema }),
  logPromotionSales
);

router.get("/promotions/credits", getPromotionCredits);

// ── Admin routes ──────────────────────────────────────────────────────────────

router.get("/admin/promotions/enrollments", getAllPromotionEnrollments);

router.post(
  "/admin/promotions/enrollments/:storeId/approve",
  validate({ body: approvePromotionEnrollmentSchema }),
  approvePromotionEnrollment
);

router.post(
  "/admin/promotions/enrollments/:storeId/reject",
  validate({ body: rejectPromotionEnrollmentSchema }),
  rejectPromotionEnrollment
);

router.get("/admin/promotions/stores/:storeId", getAdminStorePromotions);

router.post(
  "/admin/promotions/credits/apply",
  validate({ body: applyPromotionCreditSchema }),
  applyPromotionCredit
);

router.get("/admin/promotions", getAdminPromotions);

router.post(
  "/admin/promotions",
  validate({ body: createPromotionSchema }),
  createPromotion
);

router.put(
  "/admin/promotions/:id",
  validate({ body: updatePromotionSchema }),
  updatePromotion
);

router.delete("/admin/promotions/:id", deletePromotion);

export default router;
