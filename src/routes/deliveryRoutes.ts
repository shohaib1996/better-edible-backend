// src/routes/deliveryRoutes.ts
import { Router } from "express";
import {
  createDelivery,
  getAllDeliveries,
  getDeliveryById,
  updateDelivery,
  updateDeliveryStatus,
  deleteDelivery,
  checkDeliveryExists,
} from "../controllers/deliveryController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  createDeliverySchema,
  updateDeliverySchema,
  updateDeliveryStatusSchema,
  getAllDeliveriesQuery,
} from "../validators/deliverySchemas";

const router = Router();

router.post(
  "/",
  validate({ body: createDeliverySchema }),
  createDelivery /* #swagger.tags = ['Deliveries'] */
);
router.get("/check", checkDeliveryExists /* #swagger.tags = ['Deliveries'] */);
router.get(
  "/",
  validate({ query: getAllDeliveriesQuery }),
  getAllDeliveries /* #swagger.tags = ['Deliveries'] */
);
router.get(
  "/:id",
  validate({ params: idParam }),
  getDeliveryById /* #swagger.tags = ['Deliveries'] */
);
router.put(
  "/:id",
  validate({ params: idParam, body: updateDeliverySchema }),
  updateDelivery /* #swagger.tags = ['Deliveries'] */
);
router.put(
  "/:id/status",
  validate({ params: idParam, body: updateDeliveryStatusSchema }),
  updateDeliveryStatus /* #swagger.tags = ['Deliveries'] */
);
router.delete(
  "/:id",
  validate({ params: idParam }),
  deleteDelivery /* #swagger.tags = ['Deliveries'] */
);

export default router;
