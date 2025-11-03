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

router.post('/', createOrder);
router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.put('/:id', updateOrder);
router.put('/:id/status', changeOrderStatus);
router.post('/:id/payment', collectPayment);

export default router;
