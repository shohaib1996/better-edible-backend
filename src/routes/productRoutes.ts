// src/routes/productRoutes.ts
import { Router } from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
} from "../controllers/productController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  createProductSchema,
  updateProductSchema,
  toggleProductStatusSchema,
} from "../validators/productSchemas";

const router = Router();

router.get("/", getAllProducts /* #swagger.tags = ['Products'] */);
router.get(
  "/:id",
  validate({ params: idParam }),
  getProductById /* #swagger.tags = ['Products'] */
);
router.post(
  "/",
  validate({ body: createProductSchema }),
  createProduct /* #swagger.tags = ['Products'] */
);
router.put(
  "/:id",
  validate({ params: idParam, body: updateProductSchema }),
  updateProduct /* #swagger.tags = ['Products'] */
);
router.put(
  "/:id/status",
  validate({ params: idParam, body: toggleProductStatusSchema }),
  toggleProductStatus /* #swagger.tags = ['Products'] */
);
router.delete(
  "/:id",
  validate({ params: idParam }),
  deleteProduct /* #swagger.tags = ['Products'] */
);

export default router;
