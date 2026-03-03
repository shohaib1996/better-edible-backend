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
  completeProductionCallback,
} from "../controllers/clientOrderController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  createClientOrderSchema,
  updateClientOrderSchema,
  updateClientOrderStatusSchema,
  updateDeliveryDateSchema,
  toggleShipASAPSchema,
  getAllClientOrdersQuery,
} from "../validators/clientOrderSchemas";

const router = Router();

// GET routes
router.get("/", validate({ query: getAllClientOrdersQuery }), getAllClientOrders /* #swagger.tags = ['Client Orders'] */);
router.get("/:id", validate({ params: idParam }), getClientOrderById /* #swagger.tags = ['Client Orders'] */);

// POST routes
router.post("/", validate({ body: createClientOrderSchema }), createClientOrder /* #swagger.tags = ['Client Orders'] */);

// PUT/PATCH routes
router.put("/:id", validate({ params: idParam, body: updateClientOrderSchema }), updateClientOrder /* #swagger.tags = ['Client Orders'] */);
router.patch("/:id", validate({ params: idParam, body: updateClientOrderSchema }), updateClientOrder /* #swagger.tags = ['Client Orders'] */);
router.patch("/:id/status", validate({ params: idParam, body: updateClientOrderStatusSchema }), updateClientOrderStatus /* #swagger.tags = ['Client Orders'] */);
router.patch("/:id/push-to-pps", validate({ params: idParam }), pushOrderToPPS /* #swagger.tags = ['Client Orders'] */);
router.patch("/:id/delivery-date", validate({ params: idParam, body: updateDeliveryDateSchema }), updateDeliveryDate /* #swagger.tags = ['Client Orders'] */);
router.patch("/:id/ship-asap", validate({ params: idParam, body: toggleShipASAPSchema }), toggleShipASAP /* #swagger.tags = ['Client Orders'] */);
router.patch("/:id/complete-production", validate({ params: idParam }), completeProductionCallback /* #swagger.tags = ['Client Orders'] */);

// DELETE routes
router.delete("/:id", validate({ params: idParam }), deleteClientOrder /* #swagger.tags = ['Client Orders'] */);

export default router;
