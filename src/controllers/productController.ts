import { Product } from "../models/Product";
import { ProductLine } from "../models/ProductLine";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// 🔍 Get all products
export const getAllProducts = asyncHandler(async (_req, res) => {
  const products = await Product.find().populate("productLine").sort({ createdAt: -1 });
  const total = await Product.countDocuments();
  res.json({ total, products });
});

// 🧾 Get single product
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate("productLine");
  if (!product) throw new AppError("Product not found", 404);
  res.json(product);
});

// ➕ Create product
export const createProduct = asyncHandler(async (req, res) => {
  const {
    productLine,
    subProductLine,
    itemName,
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
  if (!productLineDoc) throw new AppError("Invalid product line ID", 400);

  // 🔒 Avoid duplicate entries
  const existing = await Product.findOne({
    productLine,
    subProductLine,
    itemName,
  });
  if (existing) throw new AppError("Product already exists for this line", 400);

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

  // 🔹 Multi-type pricing — dynamic based on typeLabels
  if (productLineDoc.pricingStructure.type === "multi-type") {
    const typeLabels: string[] = productLineDoc.pricingStructure.typeLabels ?? [];
    const breakdown: any = {};
    const prices: any = {};

    typeLabels.forEach((type) => {
      const key = type.toLowerCase();
      const unitVal = req.body[`${key}Units`];
      const discountVal = req.body[`${key}Discount`];
      const parsedUnit = unitVal != null && unitVal !== "" ? Number(unitVal) : null;
      const parsedDiscount = discountVal != null && discountVal !== "" ? Number(discountVal) : null;
      breakdown[key] = parsedUnit;
      prices[key] = {
        price: parsedUnit,
        discountPrice: parsedDiscount,
      };
    });

    productData.hybridBreakdown = breakdown;
    productData.prices = prices;
  }

  // 🔹 Simple pricing (e.g., Fifty-One Fifty)
  else if (productLineDoc.pricingStructure.type === "simple") {
    if (typeof price !== "number") {
      throw new AppError(`Price is required for ${productLineDoc.name} products`, 400);
    }
  }

  // 🔹 Variants pricing (e.g., BLISS Cannabis Syrup)
  else if (productLineDoc.pricingStructure.type === "variants") {
    if (!Array.isArray(variants) || variants.length === 0) {
      throw new AppError(`Variants are required for ${productLineDoc.name} products`, 400);
    }
  }

  // 🧾 Create product
  const product = await Product.create(productData);
  res.status(201).json(product);
});

// ✏️ Update product
export const updateProduct = asyncHandler(async (req, res) => {
  const { productLine } = req.body;

  const buildMultiTypePricing = (typeLabels: string[]) => {
    const breakdown: any = {};
    const prices: any = {};
    typeLabels.forEach((type) => {
      const key = type.toLowerCase();
      const unitVal = req.body[`${key}Units`];
      const discountVal = req.body[`${key}Discount`];
      const parsedUnit = unitVal != null && unitVal !== "" ? Number(unitVal) : null;
      const parsedDiscount = discountVal != null && discountVal !== "" ? Number(discountVal) : null;
      breakdown[key] = parsedUnit;
      prices[key] = {
        price: parsedUnit,
        discountPrice: parsedDiscount,
      };
    });
    req.body.hybridBreakdown = breakdown;
    req.body.prices = prices;
  };

  // 🔍 If productLine is being updated, validate it
  if (productLine) {
    const productLineDoc = await ProductLine.findById(productLine);
    if (!productLineDoc) throw new AppError("Invalid product line ID", 400);

    if (productLineDoc.pricingStructure.type === "multi-type") {
      buildMultiTypePricing(productLineDoc.pricingStructure.typeLabels ?? []);
    }
  } else {
    // If not changing productLine, check the existing product's productLine
    const existingProduct = await Product.findById(req.params.id).populate("productLine");
    if (!existingProduct) throw new AppError("Product not found", 404);

    const productLineDoc = existingProduct.productLine as any;
    if (productLineDoc.pricingStructure?.type === "multi-type") {
      buildMultiTypePricing(productLineDoc.pricingStructure.typeLabels ?? []);
    }
  }

  // Strip raw unit keys from body before saving
  const { hybridBreakdown, prices, ...rawBody } = req.body;
  const allowedKeys = [
    "subProductLine",
    "itemName",
    "price",
    "discountPrice",
    "variants",
    "priceDescription",
    "discountDescription",
    "applyDiscount",
    "active",
    "metadata",
    "productLine",
  ];
  const cleanBody: any = {};
  allowedKeys.forEach((k) => {
    if (rawBody[k] !== undefined) cleanBody[k] = rawBody[k];
  });
  if (hybridBreakdown !== undefined) {
    cleanBody.hybridBreakdown = hybridBreakdown;
    cleanBody.prices = prices;
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: cleanBody },
    { new: true }
  ).populate("productLine");

  if (!product) throw new AppError("Product not found", 404);
  res.json(product);
});

// 🟢 Toggle product active/inactive
export const toggleProductStatus = asyncHandler(async (req, res) => {
  const { active } = req.body;
  const product = await Product.findByIdAndUpdate(req.params.id, { active }, { new: true });
  if (!product) throw new AppError("Product not found", 404);
  res.json({
    message: `Product ${active ? "activated" : "deactivated"}`,
    product,
  });
});

// ❌ Delete product
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError("Product not found", 404);
  res.json({ message: "Product deleted successfully" });
});
