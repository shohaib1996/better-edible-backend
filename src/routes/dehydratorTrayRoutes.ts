import { Router } from "express";
import {
  getAllDehydratorTrays,
  getDehydratorTrayById,
  getDehydratorTrayByTrayId,
  createDehydratorTray,
  updateDehydratorTray,
  deleteDehydratorTray,
} from "../controllers/dehydratorTrayController";

const router = Router();

router.get("/", getAllDehydratorTrays /* #swagger.tags = ['DehydratorTrays'] */);
router.get("/:id", getDehydratorTrayById /* #swagger.tags = ['DehydratorTrays'] */);
router.get("/by-tray-id/:trayId", getDehydratorTrayByTrayId /* #swagger.tags = ['DehydratorTrays'] */);
router.post("/", createDehydratorTray /* #swagger.tags = ['DehydratorTrays'] */);
router.put("/:id", updateDehydratorTray /* #swagger.tags = ['DehydratorTrays'] */);
router.delete("/:id", deleteDehydratorTray /* #swagger.tags = ['DehydratorTrays'] */);

export default router;
