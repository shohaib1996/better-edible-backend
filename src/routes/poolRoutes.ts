import { Router } from "express";
import { getAllPools, getPool, triggerPool } from "../controllers/poolController";

const router = Router();

router.get("/", getAllPools /* #swagger.tags = ['Pools'] */);
router.get("/:cannabinoidKey", getPool /* #swagger.tags = ['Pools'] */);
router.post("/:id/trigger", triggerPool /* #swagger.tags = ['Pools'] */);

export default router;
