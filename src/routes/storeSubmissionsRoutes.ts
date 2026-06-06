import { Router } from "express";
import {
  getStoreSubmissions,
  advanceLabelStage,
} from "../controllers/storeLabel/storeLabelSubmissionController";

const router = Router();

router.get("/", getStoreSubmissions /* #swagger.tags = ['Store - Submissions'] */);
router.patch("/:labelId/stage", advanceLabelStage /* #swagger.tags = ['Store - Submissions'] */);

export default router;
