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

router.get('/', getAllProductLines /* #swagger.tags = ['Product Lines'] */);
router.get('/active', getActiveProductLines /* #swagger.tags = ['Product Lines'] */);
router.get('/by-name/:name', getProductLineByName /* #swagger.tags = ['Product Lines'] */);
router.get('/:id', getProductLineById /* #swagger.tags = ['Product Lines'] */);
router.post('/', createProductLine /* #swagger.tags = ['Product Lines'] */);
router.put('/:id', updateProductLine /* #swagger.tags = ['Product Lines'] */);
router.put('/:id/status', toggleProductLineStatus /* #swagger.tags = ['Product Lines'] */);
router.post('/reorder', reorderProductLines /* #swagger.tags = ['Product Lines'] */);
router.delete('/:id', deleteProductLine /* #swagger.tags = ['Product Lines'] */);

export default router;
