
import { Router } from 'express';
import {
  getAllFollowups,
  getFollowupById,
  createFollowup,
  updateFollowup,
  deleteFollowup,
} from '../controllers/followupController';

const router = Router();

router.get('/', getAllFollowups /* #swagger.tags = ['Followups'] */);
router.get('/:id', getFollowupById /* #swagger.tags = ['Followups'] */);
router.post('/', createFollowup /* #swagger.tags = ['Followups'] */);
router.put('/:id', updateFollowup /* #swagger.tags = ['Followups'] */);
router.delete('/:id', deleteFollowup /* #swagger.tags = ['Followups'] */);

export default router;
