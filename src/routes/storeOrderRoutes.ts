import { Router } from "express";
import { getMyOrders, placeOrder } from "../controllers/storeOrderController";

const router = Router();

router.get("/", getMyOrders /* #swagger.tags = ['Store - Orders'] */);
router.post("/", placeOrder /* #swagger.tags = ['Store - Orders'] */);

export default router;
