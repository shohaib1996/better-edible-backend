// src/routes/deliveryOrderRoutes.ts
import { Router } from "express";
import {
  getDeliveryOrder,
  saveDeliveryOrder,
} from "../controllers/deliveryOrderController";

const router = Router();

router.get("/", getDeliveryOrder);
router.put("/", saveDeliveryOrder);

export default router;
