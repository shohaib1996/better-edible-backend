
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

router.post('/', createSample /* #swagger.tags = ['Samples'] */);
router.get('/', getAllSamples /* #swagger.tags = ['Samples'] */);
router.get('/:id', getSampleById /* #swagger.tags = ['Samples'] */);
router.put('/:id', updateSample /* #swagger.tags = ['Samples'] */);
router.put('/:id/status', updateSampleStatus /* #swagger.tags = ['Samples'] */);
router.delete('/:id', deleteSample /* #swagger.tags = ['Samples'] */);

export default router;
