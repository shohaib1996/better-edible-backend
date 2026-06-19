import { Router } from "express";
import { validate } from "../middleware/validate";

import {
  joinPartnership,
  getPartnershipStatus,
  approvePartnership,
  rejectPartnership,
  getAllPartnershipStores,
  getStorePartnershipDetail,
} from "../controllers/partnership/partnershipEnrollmentController";

import {
  getInventory,
  placeInventory,
} from "../controllers/partnership/partnershipInventoryController";

import {
  receivePosData,
  getSales,
} from "../controllers/partnership/partnershipPosController";

import {
  getReplenishments,
  createReplenishment,
  updateReplenishmentStatus,
  deliverReplenishment,
} from "../controllers/partnership/partnershipReplenishmentController";

import {
  getBilling,
  generateBill,
  applyCredit,
  updateBillStatus,
} from "../controllers/partnership/partnershipBillingController";

import {
  joinPartnershipSchema,
  approvePartnershipSchema,
  rejectPartnershipSchema,
  placeInventorySchema,
  createReplenishmentSchema,
  updateReplenishmentStatusSchema,
  deliverReplenishmentSchema,
  posInboundSalesSchema,
  generateBillSchema,
  applyCreditSchema,
  updateBillStatusSchema,
} from "../validators/partnershipSchemas";

const router = Router();

// ── Store-facing routes ───────────────────────────────────────────────────────

router.post(
  "/partnership/join",
  validate({ body: joinPartnershipSchema }),
  joinPartnership
);
router.get("/partnership/status", getPartnershipStatus);
router.get("/partnership/inventory", getInventory);
router.get("/partnership/sales", getSales);
router.get("/partnership/replenishments", getReplenishments);
router.get("/partnership/billing", getBilling);

// ── POS inbound (X-Partnership-Key auth — no user session) ───────────────────

router.post(
  "/partnership/pos/sales",
  validate({ body: posInboundSalesSchema }),
  receivePosData
);

// ── Admin routes ──────────────────────────────────────────────────────────────

router.get("/admin/partnership", getAllPartnershipStores);
router.get("/admin/partnership/:storeId", getStorePartnershipDetail);

router.post(
  "/admin/partnership/:storeId/approve",
  validate({ body: approvePartnershipSchema }),
  approvePartnership
);
router.post(
  "/admin/partnership/:storeId/reject",
  validate({ body: rejectPartnershipSchema }),
  rejectPartnership
);

router.get("/admin/partnership/:storeId/inventory", getInventory);
router.post(
  "/admin/partnership/:storeId/inventory",
  validate({ body: placeInventorySchema }),
  placeInventory
);

router.get("/admin/partnership/:storeId/sales", getSales);

router.get("/admin/partnership/:storeId/replenishments", getReplenishments);
router.post(
  "/admin/partnership/:storeId/replenishment",
  validate({ body: createReplenishmentSchema }),
  createReplenishment
);
router.patch(
  "/admin/partnership/replenishment/:id/status",
  validate({ body: updateReplenishmentStatusSchema }),
  updateReplenishmentStatus
);
router.post(
  "/admin/partnership/replenishment/:id/deliver",
  validate({ body: deliverReplenishmentSchema }),
  deliverReplenishment
);

router.get("/admin/partnership/:storeId/billing", getBilling);
router.post(
  "/admin/partnership/:storeId/billing/generate",
  validate({ body: generateBillSchema }),
  generateBill
);
router.post(
  "/admin/partnership/billing/:billId/credit",
  validate({ body: applyCreditSchema }),
  applyCredit
);
router.patch(
  "/admin/partnership/billing/:billId/status",
  validate({ body: updateBillStatusSchema }),
  updateBillStatus
);

export default router;
