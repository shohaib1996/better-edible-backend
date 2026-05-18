import { Router } from "express";
import { getAllPools, getPool, triggerPool } from "../controllers/poolController";

const router = Router();

router.get("/", getAllPools);
router.get("/:cannabinoidKey", getPool);
router.post("/:id/trigger", triggerPool);

export default router;
