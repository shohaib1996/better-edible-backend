import { Router } from "express";
import { getMyOrders, placeOrder } from "../controllers/storeOrderController";

const router = Router();

router.get("/", getMyOrders);
router.post("/", placeOrder);

export default router;
