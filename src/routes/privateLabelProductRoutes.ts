import express from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} from "../controllers/privateLabelProductController";

const router = express.Router();

// ─────────────────────────────
// ROUTES
// ─────────────────────────────

// GET /api/private-label-products - Get all products
router.get("/", getAllProducts);

// GET /api/private-label-products/:id - Get single product
router.get("/:id", getProductById);

// POST /api/private-label-products - Create new product
router.post("/", createProduct);

// PUT /api/private-label-products/:id - Update product
router.put("/:id", updateProduct);

// DELETE /api/private-label-products/:id - Delete product
router.delete("/:id", deleteProduct);

// PUT /api/private-label-products/:id/toggle - Toggle active status
router.put("/:id/toggle", toggleProductStatus);

export default router;
