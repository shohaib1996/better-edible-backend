
import { Router } from 'express';
import {
  createSample,
  getAllSamples,
  getSampleById,
  updateSample,
  updateSampleStatus,
  deleteSample,
} from '../controllers/sampleController';

const router = Router();

router.post('/', createSample);
router.get('/', getAllSamples);
router.get('/:id', getSampleById);
router.put('/:id', updateSample);
router.put('/:id/status', updateSampleStatus);
router.delete('/:id', deleteSample);

export default router;
