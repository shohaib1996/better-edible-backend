// src/routes/storeRoutes.ts
import { Router } from 'express';
import {
  getAllStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
  toggleBlockStore,
  assignRepToStores,
  toggleBlockStores,
} from '../controllers/storeController';

const router = Router();

router.get('/', getAllStores);
router.get('/:id', getStoreById);
router.post('/', createStore);
router.post('/assign-rep', assignRepToStores);
router.post('/toggle-block', toggleBlockStores);
router.put('/:id', updateStore);
router.put('/:id/block', toggleBlockStore);
router.delete('/:id', deleteStore);

export default router;
