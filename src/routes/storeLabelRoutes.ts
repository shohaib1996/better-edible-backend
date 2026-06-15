import { Router } from "express";
import {
  getMyLabels,
  getMyRep,
  createDraftLabel,
  updateDraftLabel,
  deleteDraftLabel,
  uploadLogo,
  gummyColorProxy,
  gummyDetailsProxy,
  updateLabelRecipeData,
} from "../controllers/storeLabel/storeLabelCrudController";
import { submitLine } from "../controllers/storeLabel/storeLabelSubmissionController";
import { upload } from "../middleware/uploadMiddleware";

const router = Router();

router.get("/", getMyLabels /* #swagger.tags = ['Store - Labels'] */);
router.get("/my-rep", getMyRep /* #swagger.tags = ['Store - Labels'] */);
router.post(
  "/upload-logo",
  upload.single("logo"),
  uploadLogo /* #swagger.tags = ['Store - Labels'] */
);
router.post("/gummy-color", gummyColorProxy /* #swagger.tags = ['Store - Labels'] */);
router.post("/gummy-details", gummyDetailsProxy /* #swagger.tags = ['Store - Labels'] */);
router.post("/submit", submitLine /* #swagger.tags = ['Store - Labels'] */); // before /:id to avoid param conflict
router.post("/", createDraftLabel /* #swagger.tags = ['Store - Labels'] */);
router.put("/:id", updateDraftLabel /* #swagger.tags = ['Store - Labels'] */);
router.patch("/:id/recipe-data", updateLabelRecipeData /* #swagger.tags = ['Store - Labels'] */);
router.delete("/:id", deleteDraftLabel /* #swagger.tags = ['Store - Labels'] */);

export default router;
