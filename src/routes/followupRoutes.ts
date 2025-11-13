
import { Router } from 'express';
import {
  getAllFollowups,
  getFollowupById,
  createFollowup,
  updateFollowup,
  deleteFollowup,
} from '../controllers/followupController';

const router = Router();

router.get('/', getAllFollowups);
router.get('/:id', getFollowupById);
router.post('/', createFollowup);
router.put('/:id', updateFollowup);
router.delete('/:id', deleteFollowup);

export default router;
