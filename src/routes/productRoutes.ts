// src/routes/productRoutes.ts
import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
} from '../controllers/productController';

const router = Router();

router.get('/', getAllProducts /* #swagger.tags = ['Products'] */);
router.get('/:id', getProductById /* #swagger.tags = ['Products'] */);
router.post('/', createProduct /* #swagger.tags = ['Products'] */);
router.put('/:id', updateProduct /* #swagger.tags = ['Products'] */);
router.put('/:id/status', toggleProductStatus /* #swagger.tags = ['Products'] */);
router.delete('/:id', deleteProduct /* #swagger.tags = ['Products'] */);

export default router;
