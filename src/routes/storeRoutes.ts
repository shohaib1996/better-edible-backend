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

router.get('/', getAllStores /* #swagger.tags = ['Stores'] */);
router.get('/:id', getStoreById /* #swagger.tags = ['Stores'] */);
router.post('/', createStore /* #swagger.tags = ['Stores'] */);
router.post('/assign-rep', assignRepToStores /* #swagger.tags = ['Stores'] */);
router.post('/toggle-block', toggleBlockStores /* #swagger.tags = ['Stores'] */);
router.put('/:id', updateStore /* #swagger.tags = ['Stores'] */);
router.put('/:id/block', toggleBlockStore /* #swagger.tags = ['Stores'] */);
router.delete('/:id', deleteStore /* #swagger.tags = ['Stores'] */);

export default router;
