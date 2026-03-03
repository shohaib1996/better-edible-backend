
import { Router } from 'express';
import {
  getAllFollowups,
  getFollowupById,
  createFollowup,
  updateFollowup,
  deleteFollowup,
} from '../controllers/followupController';
import { validate } from '../middleware/validate';
import { idParam } from '../validators/commonSchemas';
import {
  createFollowupSchema,
  updateFollowupSchema,
  getAllFollowupsQuery,
} from '../validators/followupSchemas';

const router = Router();

router.get('/', validate({ query: getAllFollowupsQuery }), getAllFollowups /* #swagger.tags = ['Followups'] */);
router.get('/:id', validate({ params: idParam }), getFollowupById /* #swagger.tags = ['Followups'] */);
router.post('/', validate({ body: createFollowupSchema }), createFollowup /* #swagger.tags = ['Followups'] */);
router.put('/:id', validate({ params: idParam, body: updateFollowupSchema }), updateFollowup /* #swagger.tags = ['Followups'] */);
router.delete('/:id', validate({ params: idParam }), deleteFollowup /* #swagger.tags = ['Followups'] */);

export default router;
