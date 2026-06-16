import { Router } from "express";
import {
  getAllFollowups,
  getRepFollowups,
  getFollowupById,
  createFollowup,
  rescheduleFollowup,
  resolveFollowup,
  updateFollowup,
  deleteFollowup,
} from "../controllers/followupController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  createFollowupSchema,
  updateFollowupSchema,
  getAllFollowupsQuery,
} from "../validators/followupSchemas";

const router = Router();

// List all follow-ups (admin)
router.get("/", validate({ query: getAllFollowupsQuery }), getAllFollowups);

// Get follow-ups bucketed for a specific rep (overdue/today/upcoming)
router.get("/rep/:repId", getRepFollowups);

// Get single follow-up
router.get("/:id", validate({ params: idParam }), getFollowupById);

// Create follow-up
router.post("/", validate({ body: createFollowupSchema }), createFollowup);

// Reschedule follow-up (extend thread to new date)
router.patch("/:id/reschedule", validate({ params: idParam }), rescheduleFollowup);

// Resolve follow-up (close it)
router.patch("/:id/resolve", validate({ params: idParam }), resolveFollowup);

// General update (backwards compat)
router.put("/:id", validate({ params: idParam, body: updateFollowupSchema }), updateFollowup);

// Delete follow-up
router.delete("/:id", validate({ params: idParam }), deleteFollowup);

export default router;
