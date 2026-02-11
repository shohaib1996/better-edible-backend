// src/routes/timeLogRoutes.ts
import { Router } from 'express';
import {
  getAllTimeLogs,
  getTimeLogById,
  getTimeLogsByRepId,
  getTimeLogsSummary,
  getTimeLogsSummaryByRepId
} from '../controllers/timeLogController';

const router = Router();

router.get('/', getAllTimeLogs /* #swagger.tags = ['Time Logs'] */);
router.get('/summary', getTimeLogsSummary /* #swagger.tags = ['Time Logs'] */);
router.get('/summary/rep/:repId', getTimeLogsSummaryByRepId /* #swagger.tags = ['Time Logs'] */);
router.get('/rep/:repId', getTimeLogsByRepId /* #swagger.tags = ['Time Logs'] */);
router.get('/:id', getTimeLogById /* #swagger.tags = ['Time Logs'] */);

export default router;
