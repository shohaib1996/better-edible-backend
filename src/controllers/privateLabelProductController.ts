import { Request, Response } from "express";
import { PrivateLabelProduct } from "../models/PrivateLabelProduct";

// ─────────────────────────────
// Get All Products
// ─────────────────────────────

export const getAllProducts = async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      message: "Error fetching products",
      error: error.message,
    });
  }
};

// ─────────────────────────────
// Get Single Product
// ─────────────────────────────

export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await PrivateLabelProduct.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error: any) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      message: "Error fetching product",
      error: error.message,
    });
  }
};

// ─────────────────────────────
// Create Product
// ─────────────────────────────

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, unitPrice, description, isActive } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Product name is required" });
    }

    if (unitPrice === undefined || unitPrice < 0) {
      return res
        .status(400)
        .json({ message: "Valid unit price is required" });
    }

    // Check if product with same name already exists
    const existingProduct = await PrivateLabelProduct.findOne({
      name: name.trim(),
    });

    if (existingProduct) {
      return res.status(400).json({
        message: `Product with name "${name}" already exists`,
      });
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
  } catch (error: any) {
    console.error("Error creating product:", error);
    res.status(500).json({
      message: "Error creating product",
      error: error.message,
    });
  }
};

// ─────────────────────────────
// Update Product
// ─────────────────────────────

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { name, unitPrice, description, isActive } = req.body;

    const product = await PrivateLabelProduct.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Update fields if provided
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ message: "Product name cannot be empty" });
      }

      // Check if another product has this name
      const existingProduct = await PrivateLabelProduct.findOne({
        name: trimmedName,
        _id: { $ne: req.params.id },
      });

      if (existingProduct) {
        return res.status(400).json({
          message: `Another product with name "${trimmedName}" already exists`,
        });
      }

      product.name = trimmedName;
    }

    if (unitPrice !== undefined) {
      if (unitPrice < 0) {
        return res.status(400).json({ message: "Unit price cannot be negative" });
      }
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
  } catch (error: any) {
    console.error("Error updating product:", error);
    res.status(500).json({
      message: "Error updating product",
      error: error.message,
    });
  }
};

// ─────────────────────────────
// Delete Product
// ─────────────────────────────

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await PrivateLabelProduct.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await PrivateLabelProduct.findByIdAndDelete(req.params.id);

    res.json({
      message: "Product deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      message: "Error deleting product",
      error: error.message,
    });
  }
};

// ─────────────────────────────
// Toggle Product Active Status
// ─────────────────────────────

export const toggleProductStatus = async (req: Request, res: Response) => {
  try {
    const product = await PrivateLabelProduct.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.json({
      message: `Product ${product.isActive ? "activated" : "deactivated"} successfully`,
      product,
    });
  } catch (error: any) {
    console.error("Error toggling product status:", error);
    res.status(500).json({
      message: "Error toggling product status",
      error: error.message,
    });
  }
};
