import { Router } from "express";
import {
  getAllDehydratorUnits,
  getDehydratorUnitById,
  getDehydratorUnitByUnitId,
  createDehydratorUnit,
  updateDehydratorUnit,
  updateShelf,
  deleteDehydratorUnit,
} from "../controllers/dehydratorUnitController";

const router = Router();

router.get("/", getAllDehydratorUnits /* #swagger.tags = ['DehydratorUnits'] */);
router.get("/:id", getDehydratorUnitById /* #swagger.tags = ['DehydratorUnits'] */);
router.get("/by-unit-id/:unitId", getDehydratorUnitByUnitId /* #swagger.tags = ['DehydratorUnits'] */);
router.post("/", createDehydratorUnit /* #swagger.tags = ['DehydratorUnits'] */);
router.put("/:id", updateDehydratorUnit /* #swagger.tags = ['DehydratorUnits'] */);
router.put("/:id/shelf/:shelfPosition", updateShelf /* #swagger.tags = ['DehydratorUnits'] */);
router.delete("/:id", deleteDehydratorUnit /* #swagger.tags = ['DehydratorUnits'] */);

export default router;
