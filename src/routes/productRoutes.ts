// src/routes/productRoutes.ts
import { Router } from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  batchUpdateProductOrder,
} from "../controllers/productController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  createProductSchema,
  updateProductSchema,
  toggleProductStatusSchema,
} from "../validators/productSchemas";
import { upload } from "../middleware/uploadMiddleware";

const router = Router();

router.get("/", getAllProducts /* #swagger.tags = ['Products'] */);

// Specific routes MUST come before /:id to avoid Express matching them as params
router.put("/batch-order", batchUpdateProductOrder);

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

// Image routes
router.post(
  "/:id/images",
  validate({ params: idParam }),
  upload.array("images", 10),
  uploadProductImages
);
router.delete(
  "/:id/images",
  validate({ params: idParam }),
  deleteProductImage
);

export default router;
