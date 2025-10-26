// src/routes/storeRoutes.ts
import { Router } from 'express';
import {
  getAllStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
  toggleBlockStore,
} from '../controllers/storeController';

const router = Router();

router.get('/', getAllStores);
router.get('/:id', getStoreById);
router.post('/', createStore);
router.put('/:id', updateStore);
router.put('/:id/block', toggleBlockStore);
router.delete('/:id', deleteStore);

export default router;
