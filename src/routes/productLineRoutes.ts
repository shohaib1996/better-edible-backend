// src/routes/productLineRoutes.ts
import { Router } from 'express';
import {
  getAllProductLines,
  getActiveProductLines,
  getProductLineById,
  getProductLineByName,
  createProductLine,
  updateProductLine,
  toggleProductLineStatus,
  deleteProductLine,
  reorderProductLines,
} from '../controllers/productLineController';

const router = Router();

router.get('/', getAllProductLines);
router.get('/active', getActiveProductLines);
router.get('/by-name/:name', getProductLineByName);
router.get('/:id', getProductLineById);
router.post('/', createProductLine);
router.put('/:id', updateProductLine);
router.put('/:id/status', toggleProductLineStatus);
router.post('/reorder', reorderProductLines);
router.delete('/:id', deleteProductLine);

export default router;
