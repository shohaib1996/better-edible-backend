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

router.get('/', getAllTimeLogs);
router.get('/summary', getTimeLogsSummary);
router.get('/summary/rep/:repId', getTimeLogsSummaryByRepId);
router.get('/rep/:repId', getTimeLogsByRepId);
router.get('/:id', getTimeLogById);

export default router;
