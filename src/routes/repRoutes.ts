// src/routes/repRoutes.ts
import { Router } from "express";
import {
  getAllReps,
  getRepById,
  updateRep,
  deleteRep,
  checkInRep,
  checkOutRep,
  resetPassword,
  resetPin,
  kioskClock,
  assignFob,
} from "../controllers/repController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  checkInOutSchema,
  updateRepSchema,
  resetPasswordSchema,
  resetPinSchema,
} from "../validators/repSchemas";
import Joi from "joi";

const router = Router();

router.get("/", getAllReps /* #swagger.tags = ['Reps'] */);
router.get("/:id", validate({ params: idParam }), getRepById /* #swagger.tags = ['Reps'] */);
// router.post('/', createRep);
router.put(
  "/:id",
  validate({ params: idParam, body: updateRepSchema }),
  updateRep /* #swagger.tags = ['Reps'] */
);
router.delete("/:id", validate({ params: idParam }), deleteRep /* #swagger.tags = ['Reps'] */);
router.post(
  "/checkin",
  validate({ body: checkInOutSchema }),
  checkInRep /* #swagger.tags = ['Reps'] */
);
router.post(
  "/checkout",
  validate({ body: checkInOutSchema }),
  checkOutRep /* #swagger.tags = ['Reps'] */
);

// Kiosk clock — single toggle endpoint, accepts pin OR fobId, no auth required
router.post(
  "/kiosk-clock",
  validate({
    body: Joi.object({
      pin: Joi.string().optional(),
      fobId: Joi.string().optional(),
    }).or("pin", "fobId"),
  }),
  kioskClock /* #swagger.tags = ['Reps'] */
);

// Assign / remove fob from a rep (admin only)
router.post(
  "/:id/assign-fob",
  validate({
    params: idParam,
    body: Joi.object({ fobId: Joi.string().allow("", null).optional() }),
  }),
  assignFob /* #swagger.tags = ['Reps'] */
);

router.post(
  "/:id/reset-password",
  validate({ params: idParam, body: resetPasswordSchema }),
  resetPassword /* #swagger.tags = ['Reps'] */
);
router.post(
  "/:id/reset-pin",
  validate({ params: idParam, body: resetPinSchema }),
  resetPin /* #swagger.tags = ['Reps'] */
);

export default router;
