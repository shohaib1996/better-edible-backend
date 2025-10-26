// src/routes/deliveryRoutes.ts
import { Router } from 'express';
import {
  createDelivery,
  getAllDeliveries,
  getDeliveryById,
  updateDeliveryStatus,
  deleteDelivery,
} from '../controllers/deliveryController';

const router = Router();

router.post('/', createDelivery);
router.get('/', getAllDeliveries);
router.get('/:id', getDeliveryById);
router.put('/:id/status', updateDeliveryStatus);
router.delete('/:id', deleteDelivery);

export default router;
