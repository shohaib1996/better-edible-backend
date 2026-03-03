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
import { validate } from '../middleware/validate';
import { idParam } from '../validators/commonSchemas';
import {
  createStoreSchema,
  updateStoreSchema,
  getAllStoresQuery,
  toggleBlockStoreSchema,
  assignRepSchema,
  toggleBlockStoresSchema,
} from '../validators/storeSchemas';

const router = Router();

router.get('/', validate({ query: getAllStoresQuery }), getAllStores /* #swagger.tags = ['Stores'] */);
router.get('/:id', validate({ params: idParam }), getStoreById /* #swagger.tags = ['Stores'] */);
router.post('/', validate({ body: createStoreSchema }), createStore /* #swagger.tags = ['Stores'] */);
router.post('/assign-rep', validate({ body: assignRepSchema }), assignRepToStores /* #swagger.tags = ['Stores'] */);
router.post('/toggle-block', validate({ body: toggleBlockStoresSchema }), toggleBlockStores /* #swagger.tags = ['Stores'] */);
router.put('/:id', validate({ params: idParam, body: updateStoreSchema }), updateStore /* #swagger.tags = ['Stores'] */);
router.put('/:id/block', validate({ params: idParam, body: toggleBlockStoreSchema }), toggleBlockStore /* #swagger.tags = ['Stores'] */);
router.delete('/:id', validate({ params: idParam }), deleteStore /* #swagger.tags = ['Stores'] */);

export default router;
