// src/routes/orderRoutes.ts
import { Router } from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  changeOrderStatus,
  collectPayment,
  createPrivateLabelOrder,
} from '../controllers/orderController';
import { uploadLabels } from '../middleware/uploadMiddleware';

const router = Router();

router.post('/', createOrder);
router.post('/private-label', uploadLabels, createPrivateLabelOrder); // 🆕 Private Label route
router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.put('/:id', updateOrder);
router.put('/:id/status', changeOrderStatus);
router.post('/:id/payment', collectPayment);

export default router;
