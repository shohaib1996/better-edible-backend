// src/routes/clientOrderRoutes.ts
import { Router } from "express";
import {
  getAllClientOrders,
  getClientOrderById,
  createClientOrder,
  updateClientOrder,
  updateClientOrderStatus,
  pushOrderToPPS,
  updateDeliveryDate,
  toggleShipASAP,
  deleteClientOrder,
} from "../controllers/clientOrderController";

const router = Router();

// GET routes
router.get("/", getAllClientOrders);
router.get("/:id", getClientOrderById);

// POST routes
router.post("/", createClientOrder);

// PUT/PATCH routes
router.put("/:id", updateClientOrder);
router.patch("/:id", updateClientOrder);
router.patch("/:id/status", updateClientOrderStatus);
router.patch("/:id/push-to-pps", pushOrderToPPS);
router.patch("/:id/delivery-date", updateDeliveryDate);
router.patch("/:id/ship-asap", toggleShipASAP);

// DELETE routes
router.delete("/:id", deleteClientOrder);

export default router;
