// src/routes/labelRoutes.ts
import { Router } from "express";
import {
  getAllLabels,
  getLabelById,
  getApprovedLabelsByClient,
  createLabel,
  updateLabel,
  updateLabelStage,
  bulkUpdateLabelStages,
  deleteLabel,
} from "../controllers/labelController";
import { upload } from "../middleware/uploadMiddleware";

const router = Router();

// GET routes
router.get("/", getAllLabels);
router.get("/client/:clientId/approved", getApprovedLabelsByClient);
router.get("/:id", getLabelById);

// POST routes (with file upload)
router.post("/", upload.array("labelImages", 5), createLabel);

// PATCH routes
router.patch("/:id", upload.array("labelImages", 5), updateLabel);
router.patch("/:id/stage", updateLabelStage);
router.patch("/bulk/stage", bulkUpdateLabelStages);

// PUT routes (alias for PATCH)
router.put("/:id", upload.array("labelImages", 5), updateLabel);

// DELETE routes
router.delete("/:id", deleteLabel);

export default router;
