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
  getLabelForApproval,
  approveLabelPublic,
} from "../controllers/labelController";
import { upload } from "../middleware/uploadMiddleware";

const router = Router();

// PUBLIC routes (no auth required) - must be before other routes
router.get("/public/approve/:token", getLabelForApproval);
router.post("/public/approve/:token", approveLabelPublic);

// GET routes
router.get("/", getAllLabels);
router.get("/client/:clientId/approved", getApprovedLabelsByClient);
router.get("/:id", getLabelById);

// POST routes (with file upload)
router.post("/", upload.array("labelImages", 5), createLabel);

// PATCH routes
router.patch("/bulk/stage", bulkUpdateLabelStages); // Must be before /:id routes
router.patch("/:id", upload.array("labelImages", 5), updateLabel);
router.patch("/:id/stage", updateLabelStage);

// PUT routes (alias for PATCH)
router.put("/:id", upload.array("labelImages", 5), updateLabel);

// DELETE routes
router.delete("/:id", deleteLabel);

export default router;
