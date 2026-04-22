import { Router } from "express";
import {
  getFlavors,
  createFlavor,
  findOrCreateBlend,
  toggleFlavor,
  updateFlavor,
  deleteFlavor,
} from "../controllers/pps/flavorController";
import { validate } from "../middleware/validate";
import {
  getFlavorsQuery,
  createFlavorSchema,
  findOrCreateBlendSchema,
  updateFlavorSchema,
} from "../validators/flavorSchemas";

const router = Router();

router.get("/", validate({ query: getFlavorsQuery }), getFlavors /* #swagger.tags = ['Flavors'] */);
router.post(
  "/",
  validate({ body: createFlavorSchema }),
  createFlavor /* #swagger.tags = ['Flavors'] */
);
router.post(
  "/blend",
  validate({ body: findOrCreateBlendSchema }),
  findOrCreateBlend /* #swagger.tags = ['Flavors'] */
);
router.patch("/:flavorId/toggle", toggleFlavor /* #swagger.tags = ['Flavors'] */);
router.patch(
  "/:flavorId",
  validate({ body: updateFlavorSchema }),
  updateFlavor /* #swagger.tags = ['Flavors'] */
);
router.delete("/:flavorId", deleteFlavor /* #swagger.tags = ['Flavors'] */);

export default router;
