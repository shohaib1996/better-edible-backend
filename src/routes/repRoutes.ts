// src/routes/repRoutes.ts
import { Router } from "express";
import {
  getAllReps,
  getRepById,
  //   createRep,
  updateRep,
  deleteRep,
  checkInRep,
  checkOutRep,
  resetPassword,
  resetPin,
} from "../controllers/repController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  checkInOutSchema,
  updateRepSchema,
  resetPasswordSchema,
  resetPinSchema,
} from "../validators/repSchemas";

const router = Router();

router.get("/", getAllReps /* #swagger.tags = ['Reps'] */);
router.get("/:id", validate({ params: idParam }), getRepById /* #swagger.tags = ['Reps'] */);
// router.post('/', createRep);
router.put("/:id", validate({ params: idParam, body: updateRepSchema }), updateRep /* #swagger.tags = ['Reps'] */);
router.delete("/:id", validate({ params: idParam }), deleteRep /* #swagger.tags = ['Reps'] */);
router.post("/checkin", validate({ body: checkInOutSchema }), checkInRep /* #swagger.tags = ['Reps'] */);
router.post("/checkout", validate({ body: checkInOutSchema }), checkOutRep /* #swagger.tags = ['Reps'] */);
router.post("/:id/reset-password", validate({ params: idParam, body: resetPasswordSchema }), resetPassword /* #swagger.tags = ['Reps'] */);
router.post("/:id/reset-pin", validate({ params: idParam, body: resetPinSchema }), resetPin /* #swagger.tags = ['Reps'] */);

export default router;
