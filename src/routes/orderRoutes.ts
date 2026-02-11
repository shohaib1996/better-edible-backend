// src/routes/orderRoutes.ts
import { Router } from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  changeOrderStatus,
  collectPayment,
} from '../controllers/orderController';

const router = Router();

router.post('/', createOrder /* #swagger.tags = ['Orders'] */);
router.get('/', getAllOrders /* #swagger.tags = ['Orders'] */);
router.get('/:id', getOrderById /* #swagger.tags = ['Orders'] */);
router.put('/:id', updateOrder /* #swagger.tags = ['Orders'] */);
router.put('/:id/status', changeOrderStatus /* #swagger.tags = ['Orders'] */);
router.post('/:id/payment', collectPayment /* #swagger.tags = ['Orders'] */);

export default router;
