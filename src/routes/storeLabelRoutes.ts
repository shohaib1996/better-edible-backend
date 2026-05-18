import { Router } from "express";
import {
  getMyLabels,
  createDraftLabel,
  updateDraftLabel,
  deleteDraftLabel,
  submitLine,
} from "../controllers/storeLabelController";

const router = Router();

router.get("/", getMyLabels /* #swagger.tags = ['Store - Labels'] */);
router.post("/submit", submitLine /* #swagger.tags = ['Store - Labels'] */); // before /:id to avoid param conflict
router.post("/", createDraftLabel /* #swagger.tags = ['Store - Labels'] */);
router.put("/:id", updateDraftLabel /* #swagger.tags = ['Store - Labels'] */);
router.delete("/:id", deleteDraftLabel /* #swagger.tags = ['Store - Labels'] */);

export default router;
