import { PrivateLabelProduct } from "../models/PrivateLabelProduct";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// ─────────────────────────────
// Get All Products
// ─────────────────────────────

export const getAllProducts = asyncHandler(async (req, res) => {
  const { activeOnly } = req.query;

  const filter: any = {};
  if (activeOnly === "true") {
    filter.isActive = true;
  }

  const products = await PrivateLabelProduct.find(filter).sort({ name: 1 });

  res.json({
    total: products.length,
    products,
  });
});

// ─────────────────────────────
// Get Single Product
// ─────────────────────────────

export const getProductById = asyncHandler(async (req, res) => {
  const product = await PrivateLabelProduct.findById(req.params.id);
  if (!product) throw new AppError("Product not found", 404);
  res.json(product);
});

// ─────────────────────────────
// Create Products
// ─────────────────────────────

export const createProduct = asyncHandler(async (req, res) => {
  const { name, unitPrice, description, isActive } = req.body;

  // Validate required fields
  if (!name || !name.trim()) {
    throw new AppError("Product name is required", 400);
  }

  if (unitPrice === undefined || unitPrice < 0) {
    throw new AppError("Valid unit price is required", 400);
  }

  // Check if product with same name already exists
  const existingProduct = await PrivateLabelProduct.findOne({
    name: name.trim(),
  });

  if (existingProduct) {
    throw new AppError(`Product with name "${name}" already exists`, 400);
  }

  // Create new product
  const product = await PrivateLabelProduct.create({
    name: name.trim(),
    unitPrice: Number(unitPrice),
    description: description?.trim(),
    isActive: isActive !== undefined ? isActive : true,
  });

  res.status(201).json({
    message: "Product created successfully",
    product,
  });
});

// ─────────────────────────────
// Update Product
// ─────────────────────────────

export const updateProduct = asyncHandler(async (req, res) => {
  const { name, unitPrice, description, isActive } = req.body;

  const product = await PrivateLabelProduct.findById(req.params.id);
  if (!product) throw new AppError("Product not found", 404);

  // Update fields if provided
  if (name !== undefined) {
    const trimmedName = name.trim();
    if (!trimmedName) throw new AppError("Product name cannot be empty", 400);

    // Check if another product has this name
    const existingProduct = await PrivateLabelProduct.findOne({
      name: trimmedName,
      _id: { $ne: req.params.id },
    });

    if (existingProduct) {
      throw new AppError(`Another product with name "${trimmedName}" already exists`, 400);
    }

    product.name = trimmedName;
  }

  if (unitPrice !== undefined) {
    if (unitPrice < 0) throw new AppError("Unit price cannot be negative", 400);
    product.unitPrice = Number(unitPrice);
  }

  if (description !== undefined) {
    product.description = description?.trim();
  }

  if (isActive !== undefined) {
    product.isActive = Boolean(isActive);
  }

  await product.save();

  res.json({
    message: "Product updated successfully",
    product,
  });
});

// ─────────────────────────────
// Delete Product
// ─────────────────────────────

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await PrivateLabelProduct.findById(req.params.id);
  if (!product) throw new AppError("Product not found", 404);

  await PrivateLabelProduct.findByIdAndDelete(req.params.id);

  res.json({
    message: "Product deleted successfully",
  });
});

// ─────────────────────────────
// Toggle Product Active Status
// ─────────────────────────────

export const toggleProductStatus = asyncHandler(async (req, res) => {
  const product = await PrivateLabelProduct.findById(req.params.id);
  if (!product) throw new AppError("Product not found", 404);

  product.isActive = !product.isActive;
  await product.save();

  res.json({
    message: `Product ${product.isActive ? "activated" : "deactivated"} successfully`,
    product,
  });
});
