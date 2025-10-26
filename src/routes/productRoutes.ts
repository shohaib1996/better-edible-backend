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

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.put('/:id/status', toggleProductStatus);
router.delete('/:id', deleteProduct);

export default router;
