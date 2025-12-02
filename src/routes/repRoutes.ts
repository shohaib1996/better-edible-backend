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

router.get("/", getAllReps);
router.get("/:id", getRepById);
// router.post('/', createRep);
router.put("/:id", updateRep);
router.delete("/:id", deleteRep);
router.post("/checkin", checkInRep);
router.post("/checkout", checkOutRep);
router.post("/:id/reset-password", resetPassword);
router.post("/:id/reset-pin", resetPin);

export default router;
