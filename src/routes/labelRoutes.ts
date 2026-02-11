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
router.get("/public/approve/:token", getLabelForApproval /* #swagger.tags = ['Labels'] */);
router.post("/public/approve/:token", approveLabelPublic /* #swagger.tags = ['Labels'] */);

// GET routes
router.get("/", getAllLabels /* #swagger.tags = ['Labels'] */);
router.get("/client/:clientId/approved", getApprovedLabelsByClient /* #swagger.tags = ['Labels'] */);
router.get("/:id", getLabelById /* #swagger.tags = ['Labels'] */);

// POST routes (with file upload)
router.post("/", upload.array("labelImages", 5), createLabel /* #swagger.tags = ['Labels'] */);

// PATCH routes
router.patch("/bulk/stage", bulkUpdateLabelStages /* #swagger.tags = ['Labels'] */); // Must be before /:id routes
router.patch("/:id", upload.array("labelImages", 5), updateLabel /* #swagger.tags = ['Labels'] */);
router.patch("/:id/stage", updateLabelStage /* #swagger.tags = ['Labels'] */);

// PUT routes (alias for PATCH)
router.put("/:id", upload.array("labelImages", 5), updateLabel /* #swagger.tags = ['Labels'] */);

// DELETE routes
router.delete("/:id", deleteLabel /* #swagger.tags = ['Labels'] */);

export default router;
