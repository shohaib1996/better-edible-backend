
import { Router } from 'express';
import {
  getAllContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} from '../controllers/contactController';
import { validate } from '../middleware/validate';
import { idParam } from '../validators/commonSchemas';
import {
  createContactSchema,
  updateContactSchema,
  getAllContactsQuery,
} from '../validators/contactSchemas';

const router = Router();

router.get('/', validate({ query: getAllContactsQuery }), getAllContacts /* #swagger.tags = ['Contacts'] */);
router.get('/:id', validate({ params: idParam }), getContactById /* #swagger.tags = ['Contacts'] */);
router.post('/', validate({ body: createContactSchema }), createContact /* #swagger.tags = ['Contacts'] */);
router.put('/:id', validate({ params: idParam, body: updateContactSchema }), updateContact /* #swagger.tags = ['Contacts'] */);
router.delete('/:id', validate({ params: idParam }), deleteContact /* #swagger.tags = ['Contacts'] */);

export default router;
