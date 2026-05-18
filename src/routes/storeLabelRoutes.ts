import { Router } from "express";
import {
  getMyLabels,
  createDraftLabel,
  updateDraftLabel,
  deleteDraftLabel,
  submitLine,
} from "../controllers/storeLabelController";

const router = Router();

router.get("/", getMyLabels);
router.post("/submit", submitLine);   // before /:id to avoid param conflict
router.post("/", createDraftLabel);
router.put("/:id", updateDraftLabel);
router.delete("/:id", deleteDraftLabel);

export default router;
