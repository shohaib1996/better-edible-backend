
import { Router } from 'express';
import {
  getAllContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} from '../controllers/contactController';

const router = Router();

router.get('/', getAllContacts /* #swagger.tags = ['Contacts'] */);
router.get('/:id', getContactById /* #swagger.tags = ['Contacts'] */);
router.post('/', createContact /* #swagger.tags = ['Contacts'] */);
router.put('/:id', updateContact /* #swagger.tags = ['Contacts'] */);
router.delete('/:id', deleteContact /* #swagger.tags = ['Contacts'] */);

export default router;
