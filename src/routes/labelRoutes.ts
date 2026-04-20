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
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  updateLabelStageSchema,
  bulkUpdateLabelStagesSchema,
  getAllLabelsQuery,
} from "../validators/labelSchemas";

const router = Router();

// PUBLIC routes (no auth required) - must be before other routes
router.get("/public/approve/:token", getLabelForApproval /* #swagger.tags = ['Labels'] */);
router.post("/public/approve/:token", approveLabelPublic /* #swagger.tags = ['Labels'] */);

// GET routes
router.get(
  "/",
  validate({ query: getAllLabelsQuery }),
  getAllLabels /* #swagger.tags = ['Labels'] */
);
router.get(
  "/client/:clientId/approved",
  getApprovedLabelsByClient /* #swagger.tags = ['Labels'] */
);
router.get("/:id", validate({ params: idParam }), getLabelById /* #swagger.tags = ['Labels'] */);

// POST routes (with file upload)
router.post("/", upload.array("labelImages", 5), createLabel /* #swagger.tags = ['Labels'] */);

// PATCH routes
router.patch(
  "/bulk/stage",
  validate({ body: bulkUpdateLabelStagesSchema }),
  bulkUpdateLabelStages /* #swagger.tags = ['Labels'] */
); // Must be before /:id routes
router.patch("/:id", upload.array("labelImages", 5), updateLabel /* #swagger.tags = ['Labels'] */);
router.patch(
  "/:id/stage",
  validate({ params: idParam, body: updateLabelStageSchema }),
  updateLabelStage /* #swagger.tags = ['Labels'] */
);

// PUT routes (alias for PATCH)
router.put("/:id", upload.array("labelImages", 5), updateLabel /* #swagger.tags = ['Labels'] */);

// DELETE routes
router.delete("/:id", validate({ params: idParam }), deleteLabel /* #swagger.tags = ['Labels'] */);

export default router;
