// src/routes/deliveryRoutes.ts
import { Router } from 'express';
import {
  createDelivery,
  getAllDeliveries,
  getDeliveryById,
  updateDelivery,
  updateDeliveryStatus,
  deleteDelivery,
} from '../controllers/deliveryController';

const router = Router();

router.post('/', createDelivery /* #swagger.tags = ['Deliveries'] */);
router.get('/', getAllDeliveries /* #swagger.tags = ['Deliveries'] */);
router.get('/:id', getDeliveryById /* #swagger.tags = ['Deliveries'] */);
router.put('/:id', updateDelivery /* #swagger.tags = ['Deliveries'] */);
router.put('/:id/status', updateDeliveryStatus /* #swagger.tags = ['Deliveries'] */);
router.delete('/:id', deleteDelivery /* #swagger.tags = ['Deliveries'] */);

export default router;
