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
import { validate } from '../middleware/validate';
import { idParam } from '../validators/commonSchemas';
import {
  createOrderSchema,
  updateOrderSchema,
  changeOrderStatusSchema,
  collectPaymentSchema,
  getAllOrdersQuery,
} from '../validators/orderSchemas';

const router = Router();

router.post('/', validate({ body: createOrderSchema }), createOrder /* #swagger.tags = ['Orders'] */);
router.get('/', validate({ query: getAllOrdersQuery }), getAllOrders /* #swagger.tags = ['Orders'] */);
router.get('/:id', validate({ params: idParam }), getOrderById /* #swagger.tags = ['Orders'] */);
router.put('/:id', validate({ params: idParam, body: updateOrderSchema }), updateOrder /* #swagger.tags = ['Orders'] */);
router.put('/:id/status', validate({ params: idParam, body: changeOrderStatusSchema }), changeOrderStatus /* #swagger.tags = ['Orders'] */);
router.post('/:id/payment', validate({ params: idParam, body: collectPaymentSchema }), collectPayment /* #swagger.tags = ['Orders'] */);

export default router;
