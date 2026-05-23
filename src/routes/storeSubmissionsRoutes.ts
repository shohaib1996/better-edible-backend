import { Router } from "express";
import { getStoreSubmissions } from "../controllers/storeLabelController";

const router = Router();

router.get("/", getStoreSubmissions /* #swagger.tags = ['Store - Submissions'] */);

export default router;
