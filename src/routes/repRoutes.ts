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

const router = Router();

router.get("/", getAllReps /* #swagger.tags = ['Reps'] */);
router.get("/:id", getRepById /* #swagger.tags = ['Reps'] */);
// router.post('/', createRep);
router.put("/:id", updateRep /* #swagger.tags = ['Reps'] */);
router.delete("/:id", deleteRep /* #swagger.tags = ['Reps'] */);
router.post("/checkin", checkInRep /* #swagger.tags = ['Reps'] */);
router.post("/checkout", checkOutRep /* #swagger.tags = ['Reps'] */);
router.post("/:id/reset-password", resetPassword /* #swagger.tags = ['Reps'] */);
router.post("/:id/reset-pin", resetPin /* #swagger.tags = ['Reps'] */);

export default router;
