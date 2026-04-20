import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} from "../controllers/privateLabelProductController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  createPrivateLabelProductSchema,
  updatePrivateLabelProductSchema,
} from "../validators/privateLabelProductSchemas";

const router = express.Router();

// ─────────────────────────────
// ROUTES
// ─────────────────────────────

// GET /api/private-label-products - Get all products
router.get("/", getAllProducts /* #swagger.tags = ['Private Label Products'] */);

// GET /api/private-label-products/:id - Get single product
router.get(
  "/:id",
  validate({ params: idParam }),
  getProductById /* #swagger.tags = ['Private Label Products'] */
);

// POST /api/private-label-products - Create new product
router.post(
  "/",
  validate({ body: createPrivateLabelProductSchema }),
  createProduct /* #swagger.tags = ['Private Label Products'] */
);

// PUT /api/private-label-products/:id - Update product
router.put(
  "/:id",
  validate({ params: idParam, body: updatePrivateLabelProductSchema }),
  updateProduct /* #swagger.tags = ['Private Label Products'] */
);

// DELETE /api/private-label-products/:id - Delete product
router.delete(
  "/:id",
  validate({ params: idParam }),
  deleteProduct /* #swagger.tags = ['Private Label Products'] */
);

// PUT /api/private-label-products/:id/toggle - Toggle active status
router.put(
  "/:id/toggle",
  validate({ params: idParam }),
  toggleProductStatus /* #swagger.tags = ['Private Label Products'] */
);

export default router;
