import { Request, Response } from "express";
import { Product } from "../models/Product";
import { ProductLine } from "../models/ProductLine";

// 🔍 Get all products
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find()
      .populate('productLine')
      .sort({ createdAt: -1 });
    const total = await Product.countDocuments();
    res.json({ total, products });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error });
  }
};

// 🧾 Get single product
export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('productLine');
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
      hybridUnits,
      hybridDiscount,
      indicaUnits,
      indicaDiscount,
      sativaUnits,
      sativaDiscount,
      price,
      discountPrice,
      variants,
      priceDescription,
      discountDescription,
      applyDiscount,
      active = true,
      metadata,
    } = req.body;

    // 🔍 Fetch the ProductLine to determine pricing structure
    const productLineDoc = await ProductLine.findById(productLine);
    if (!productLineDoc) {
      return res.status(400).json({ message: "Invalid product line ID" });
    }

    // 🔒 Avoid duplicate entries
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

    // 🔧 Build product object dynamically
    const productData: any = {
      productLine,
      subProductLine,
      itemName,
      price,
      discountPrice,
      variants,
      priceDescription,
      discountDescription,
      applyDiscount,
      active,
      metadata,
    };

    // 🔹 Multi-type pricing (e.g., Cannacrispy with hybrid/indica/sativa)
    if (productLineDoc.pricingStructure.type === "multi-type") {
      productData.hybridBreakdown = {
        hybrid: hybridUnits ? parseFloat(hybridUnits) : undefined,
        indica: indicaUnits ? parseFloat(indicaUnits) : undefined,
        sativa: sativaUnits ? parseFloat(sativaUnits) : undefined,
      };

      // ✅ Store prices per type
      productData.prices = {
        hybrid: {
          price: hybridUnits ? parseFloat(hybridUnits) : undefined,
          discountPrice: hybridDiscount
            ? parseFloat(hybridDiscount)
            : undefined,
        },
        indica: {
          price: indicaUnits ? parseFloat(indicaUnits) : undefined,
          discountPrice: indicaDiscount
            ? parseFloat(indicaDiscount)
            : undefined,
        },
        sativa: {
          price: sativaUnits ? parseFloat(sativaUnits) : undefined,
          discountPrice: sativaDiscount
            ? parseFloat(sativaDiscount)
            : undefined,
        },
      };
    }

    // 🔹 Simple pricing (e.g., Fifty-One Fifty)
    else if (productLineDoc.pricingStructure.type === "simple") {
      if (typeof price !== "number") {
        return res.status(400).json({
          message: `Price is required for ${productLineDoc.name} products`,
        });
      }
    }

    // 🔹 Variants pricing (e.g., BLISS Cannabis Syrup)
    else if (productLineDoc.pricingStructure.type === "variants") {
      if (!Array.isArray(variants) || variants.length === 0) {
        return res.status(400).json({
          message: `Variants are required for ${productLineDoc.name} products`,
        });
      }
    }

    // 🧾 Create product
    const product = await Product.create(productData);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error creating product", error });
  }
};

// ✏️ Update product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const {
      productLine,
      hybridUnits,
      hybridDiscount,
      indicaUnits,
      indicaDiscount,
      sativaUnits,
      sativaDiscount,
    } = req.body;

    // 🔍 If productLine is being updated, validate it
    if (productLine) {
      const productLineDoc = await ProductLine.findById(productLine);
      if (!productLineDoc) {
        return res.status(400).json({ message: "Invalid product line ID" });
      }

      // 🔹 Handle multi-type pricing updates (e.g., Cannacrispy)
      if (productLineDoc.pricingStructure.type === "multi-type") {
        req.body.hybridBreakdown = {
          hybrid: hybridUnits ?? req.body.hybridBreakdown?.hybrid,
          indica: indicaUnits ?? req.body.hybridBreakdown?.indica,
          sativa: sativaUnits ?? req.body.hybridBreakdown?.sativa,
        };

        req.body.prices = {
          hybrid: {
            price: hybridUnits ? parseFloat(hybridUnits) : undefined,
            discountPrice: hybridDiscount
              ? parseFloat(hybridDiscount)
              : undefined,
          },
          indica: {
            price: indicaUnits ? parseFloat(indicaUnits) : undefined,
            discountPrice: indicaDiscount
              ? parseFloat(indicaDiscount)
              : undefined,
          },
          sativa: {
            price: sativaUnits ? parseFloat(sativaUnits) : undefined,
            discountPrice: sativaDiscount
              ? parseFloat(sativaDiscount)
              : undefined,
          },
        };
      }
    } else {
      // If not changing productLine, check the existing product's productLine
      const existingProduct = await Product.findById(req.params.id).populate('productLine');
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const productLineDoc = existingProduct.productLine as any;
      if (productLineDoc.pricingStructure?.type === "multi-type") {
        req.body.hybridBreakdown = {
          hybrid: hybridUnits ?? req.body.hybridBreakdown?.hybrid,
          indica: indicaUnits ?? req.body.hybridBreakdown?.indica,
          sativa: sativaUnits ?? req.body.hybridBreakdown?.sativa,
        };

        req.body.prices = {
          hybrid: {
            price: hybridUnits ? parseFloat(hybridUnits) : undefined,
            discountPrice: hybridDiscount
              ? parseFloat(hybridDiscount)
              : undefined,
          },
          indica: {
            price: indicaUnits ? parseFloat(indicaUnits) : undefined,
            discountPrice: indicaDiscount
              ? parseFloat(indicaDiscount)
              : undefined,
          },
          sativa: {
            price: sativaUnits ? parseFloat(sativaUnits) : undefined,
            discountPrice: sativaDiscount
              ? parseFloat(sativaDiscount)
              : undefined,
          },
        };
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate('productLine');

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
