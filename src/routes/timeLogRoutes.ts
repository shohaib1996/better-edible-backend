// src/routes/timeLogRoutes.ts
import { Router } from "express";
import {
  getAllTimeLogs,
  getTimeLogById,
  getTimeLogsByRepId,
  getTimeLogsSummary,
  getTimeLogsSummaryByRepId,
} from "../controllers/timeLogController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import { dateRangeQuery } from "../validators/timeLogSchemas";

const router = Router();

router.get(
  "/",
  validate({ query: dateRangeQuery }),
  getAllTimeLogs /* #swagger.tags = ['Time Logs'] */
);
router.get(
  "/summary",
  validate({ query: dateRangeQuery }),
  getTimeLogsSummary /* #swagger.tags = ['Time Logs'] */
);
router.get("/summary/rep/:repId", getTimeLogsSummaryByRepId /* #swagger.tags = ['Time Logs'] */);
router.get("/rep/:repId", getTimeLogsByRepId /* #swagger.tags = ['Time Logs'] */);
router.get(
  "/:id",
  validate({ params: idParam }),
  getTimeLogById /* #swagger.tags = ['Time Logs'] */
);

export default router;
