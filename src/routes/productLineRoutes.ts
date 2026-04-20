// src/routes/productLineRoutes.ts
import { Router } from "express";
import {
  getAllProductLines,
  getActiveProductLines,
  getProductLineById,
  getProductLineByName,
  createProductLine,
  updateProductLine,
  toggleProductLineStatus,
  deleteProductLine,
  reorderProductLines,
} from "../controllers/productLineController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  createProductLineSchema,
  updateProductLineSchema,
  toggleProductLineStatusSchema,
  reorderProductLinesSchema,
} from "../validators/productLineSchemas";

const router = Router();

router.get("/", getAllProductLines /* #swagger.tags = ['Product Lines'] */);
router.get("/active", getActiveProductLines /* #swagger.tags = ['Product Lines'] */);
router.get("/by-name/:name", getProductLineByName /* #swagger.tags = ['Product Lines'] */);
router.get(
  "/:id",
  validate({ params: idParam }),
  getProductLineById /* #swagger.tags = ['Product Lines'] */
);
router.post(
  "/",
  validate({ body: createProductLineSchema }),
  createProductLine /* #swagger.tags = ['Product Lines'] */
);
router.put(
  "/:id",
  validate({ params: idParam, body: updateProductLineSchema }),
  updateProductLine /* #swagger.tags = ['Product Lines'] */
);
router.put(
  "/:id/status",
  validate({ params: idParam, body: toggleProductLineStatusSchema }),
  toggleProductLineStatus /* #swagger.tags = ['Product Lines'] */
);
router.post(
  "/reorder",
  validate({ body: reorderProductLinesSchema }),
  reorderProductLines /* #swagger.tags = ['Product Lines'] */
);
router.delete(
  "/:id",
  validate({ params: idParam }),
  deleteProductLine /* #swagger.tags = ['Product Lines'] */
);

export default router;
