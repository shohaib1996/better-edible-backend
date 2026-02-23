import { Router } from "express";
import {
  getAllMolds,
  getMoldById,
  getMoldByMoldId,
  createMold,
  updateMold,
  deleteMold,
} from "../controllers/moldController";

const router = Router();

router.get("/", getAllMolds /* #swagger.tags = ['Molds'] */);
router.get("/:id", getMoldById /* #swagger.tags = ['Molds'] */);
router.get("/by-mold-id/:moldId", getMoldByMoldId /* #swagger.tags = ['Molds'] */);
router.post("/", createMold /* #swagger.tags = ['Molds'] */);
router.put("/:id", updateMold /* #swagger.tags = ['Molds'] */);
router.delete("/:id", deleteMold /* #swagger.tags = ['Molds'] */);

export default router;
