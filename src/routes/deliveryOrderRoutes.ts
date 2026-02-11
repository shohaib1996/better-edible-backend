// src/routes/deliveryOrderRoutes.ts
import { Router } from "express";
import {
  getDeliveryOrder,
  saveDeliveryOrder,
} from "../controllers/deliveryOrderController";

const router = Router();

router.get("/", getDeliveryOrder /* #swagger.tags = ['Delivery Orders'] */);
router.put("/", saveDeliveryOrder /* #swagger.tags = ['Delivery Orders'] */);

export default router;
