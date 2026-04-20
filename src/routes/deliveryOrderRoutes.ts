// src/routes/deliveryOrderRoutes.ts
import { Router } from "express";
import { getDeliveryOrder, saveDeliveryOrder } from "../controllers/deliveryOrderController";
import { validate } from "../middleware/validate";
import { getDeliveryOrderQuery, saveDeliveryOrderSchema } from "../validators/deliveryOrderSchemas";

const router = Router();

router.get(
  "/",
  validate({ query: getDeliveryOrderQuery }),
  getDeliveryOrder /* #swagger.tags = ['Delivery Orders'] */
);
router.put(
  "/",
  validate({ body: saveDeliveryOrderSchema }),
  saveDeliveryOrder /* #swagger.tags = ['Delivery Orders'] */
);

export default router;
