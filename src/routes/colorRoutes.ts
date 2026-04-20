import { Router } from "express";
import { getColors, createColor, toggleColor, updateColor } from "../controllers/colorController";
import { validate } from "../middleware/validate";
import { getColorsQuery, createColorSchema, updateColorSchema } from "../validators/colorSchemas";

const router = Router();

router.get("/", validate({ query: getColorsQuery }), getColors /* #swagger.tags = ['Colors'] */);
router.post(
  "/",
  validate({ body: createColorSchema }),
  createColor /* #swagger.tags = ['Colors'] */
);
router.patch("/:colorId/toggle", toggleColor /* #swagger.tags = ['Colors'] */);
router.patch(
  "/:colorId",
  validate({ body: updateColorSchema }),
  updateColor /* #swagger.tags = ['Colors'] */
);

export default router;
