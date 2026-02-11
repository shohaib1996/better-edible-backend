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
router.get("/", getAllClientOrders /* #swagger.tags = ['Client Orders'] */);
router.get("/:id", getClientOrderById /* #swagger.tags = ['Client Orders'] */);

// POST routes
router.post("/", createClientOrder /* #swagger.tags = ['Client Orders'] */);

// PUT/PATCH routes
router.put("/:id", updateClientOrder /* #swagger.tags = ['Client Orders'] */);
router.patch("/:id", updateClientOrder /* #swagger.tags = ['Client Orders'] */);
router.patch("/:id/status", updateClientOrderStatus /* #swagger.tags = ['Client Orders'] */);
router.patch("/:id/push-to-pps", pushOrderToPPS /* #swagger.tags = ['Client Orders'] */);
router.patch("/:id/delivery-date", updateDeliveryDate /* #swagger.tags = ['Client Orders'] */);
router.patch("/:id/ship-asap", toggleShipASAP /* #swagger.tags = ['Client Orders'] */);

// DELETE routes
router.delete("/:id", deleteClientOrder /* #swagger.tags = ['Client Orders'] */);

export default router;
