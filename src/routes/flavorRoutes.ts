import { Router } from "express";
import {
  getFlavors,
  createFlavor,
  findOrCreateBlend,
  toggleFlavor,
  updateFlavor,
} from "../controllers/flavorController";

const router = Router();

router.get("/", getFlavors /* #swagger.tags = ['Flavors'] */);
router.post("/", createFlavor /* #swagger.tags = ['Flavors'] */);
router.post("/blend", findOrCreateBlend /* #swagger.tags = ['Flavors'] */);
router.patch("/:flavorId/toggle", toggleFlavor /* #swagger.tags = ['Flavors'] */);
router.patch("/:flavorId", updateFlavor /* #swagger.tags = ['Flavors'] */);

export default router;
