import { Router } from "express";
import {
  getColors,
  createColor,
  toggleColor,
  updateColor,
} from "../controllers/colorController";

const router = Router();

router.get("/", getColors /* #swagger.tags = ['Colors'] */);
router.post("/", createColor /* #swagger.tags = ['Colors'] */);
router.patch("/:colorId/toggle", toggleColor /* #swagger.tags = ['Colors'] */);
router.patch("/:colorId", updateColor /* #swagger.tags = ['Colors'] */);

export default router;
