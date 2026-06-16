// src/routes/mapOrdersRoutes.ts
import { Router } from "express";
import { getMapOrders, createRouteFromMap } from "../controllers/mapOrdersController";

const router = Router();

// GET /api/map-orders?date=YYYY-MM-DD&type=orders|samples|both
router.get("/", getMapOrders);

// POST /api/map-orders/create-route
router.post("/create-route", createRouteFromMap);

export default router;
