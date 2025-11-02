// src/controllers/productController.ts
import { Request, Response } from "express";
import { Product } from "../models/Product";

// 🔍 Get all products
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    const total = await Product.countDocuments();
    res.json({ total, products });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error });
  }
};

// 🧾 Get single product
export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error });
  }
};

// ➕ Create product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      productLine,
      subProductLine,
      itemName,
      hybridBreakdown,
      price,
      discountPrice,
      variants,
      priceDescription,
      discountDescription,
      applyDiscount,
      active = true,
      metadata,
    } = req.body;

    // Avoid duplicate entries
    const existing = await Product.findOne({
      productLine,
      subProductLine,
      itemName,
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Product already exists for this line" });
    }

    // 🔧 Build dynamic product object
    const productData: any = {
      productLine,
      subProductLine,
      itemName,
      hybridBreakdown,
      price,
      discountPrice,
      variants,
      priceDescription,
      discountDescription,
      applyDiscount,
      active,
      metadata,
    };

    // Validate product type
    if (productLine === "Cannacrispy") {
      if (!hybridBreakdown) {
        return res
          .status(400)
          .json({
            message:
              "Hybrid, Indica, and Sativa values are required for Cannacrispy",
          });
      }
    } else if (productLine === "Fifty-One Fifty") {
      if (typeof price !== "number") {
        return res
          .status(400)
          .json({ message: "Price is required for Fifty-One Fifty products" });
      }
    } else if (productLine === "BLISS Cannabis Syrup") {
      if (!Array.isArray(variants) || variants.length === 0) {
        return res
          .status(400)
          .json({
            message:
              "Variants (100mg, 300mg, 1000mg) are required for BLISS Syrup",
          });
      }
    }

    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error creating product", error });
  }
};

// ✏️ Update product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Error updating product", error });
  }
};

// 🟢 Toggle product active/inactive
export const toggleProductStatus = async (req: Request, res: Response) => {
  try {
    const { active } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { active },
      { new: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({
      message: `Product ${active ? "activated" : "deactivated"}`,
      product,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating product status", error });
  }
};

// ❌ Delete product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error });
  }
};
