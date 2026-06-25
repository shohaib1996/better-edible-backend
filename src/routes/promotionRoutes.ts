import { Router } from "express";
import { validate } from "../middleware/validate";
import {
  getAdminPromotions,
  getAdminPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion,
  getPromotionUsage,
} from "../controllers/promotions/promotionController";
import {
  validatePromoCode,
  getAutoApplyPromotions,
  getPublicPromotions,
  getStorePromotions,
  getStoreUsage,
  applyPromoToOrder,
} from "../controllers/promotions/promotionApplyController";
import {
  createPromotionSchema,
  updatePromotionSchema,
  validatePromoCodeSchema,
  applyPromoToOrderSchema,
} from "../validators/promotionSchemas";

const router = Router();

// ── Admin CRUD ──────────────────────────────────────────────────────────────
router.get("/admin/promotions", getAdminPromotions);
router.get("/admin/promotions/:id/usage", getPromotionUsage);
router.get("/admin/promotions/:id", getAdminPromotion);
router.post("/admin/promotions", validate({ body: createPromotionSchema }), createPromotion);
router.put("/admin/promotions/:id", validate({ body: updatePromotionSchema }), updatePromotion);
router.delete("/admin/promotions/:id", deletePromotion);
router.post(
  "/admin/promotions/apply",
  validate({ body: applyPromoToOrderSchema }),
  applyPromoToOrder
);

// ── Store / public ──────────────────────────────────────────────────────────
router.get("/promotions/public", getPublicPromotions);
router.get("/promotions/for-store", getStorePromotions);
router.get("/promotions/auto-apply", getAutoApplyPromotions);
router.get("/promotions/usage", getStoreUsage);
router.post("/promotions/validate", validate({ body: validatePromoCodeSchema }), validatePromoCode);

export default router;
