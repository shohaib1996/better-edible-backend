// src/routes/timeLogRoutes.ts
import { Router } from 'express';
import { getAllTimeLogs, getTimeLogById, getTimeLogsByRepId } from '../controllers/timeLogController';

const router = Router();

router.get('/', getAllTimeLogs);
router.get('/:id', getTimeLogById);
router.get('/rep/:repId', getTimeLogsByRepId);

export default router;
