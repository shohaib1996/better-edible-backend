import { ProductLine } from "../models/ProductLine";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// 🔍 Get all product lines
export const getAllProductLines = asyncHandler(async (_req, res) => {
  const productLines = await ProductLine.find().sort({ displayOrder: 1 });
  const total = await ProductLine.countDocuments();
  res.json({ total, productLines });
});

// 🔍 Get active product lines only
export const getActiveProductLines = asyncHandler(async (_req, res) => {
  const productLines = await ProductLine.find({ active: true }).sort({ displayOrder: 1 });
  res.json({ productLines });
});

// 🧾 Get single product line
export const getProductLineById = asyncHandler(async (req, res) => {
  const productLine = await ProductLine.findById(req.params.id);
  if (!productLine) throw new AppError("Product line not found", 404);
  res.json(productLine);
});

// 🧾 Get product line by name
export const getProductLineByName = asyncHandler(async (req, res) => {
  const productLine = await ProductLine.findOne({ name: req.params.name });
  if (!productLine) throw new AppError("Product line not found", 404);
  res.json(productLine);
});

// ➕ Create product line
export const createProductLine = asyncHandler(async (req, res) => {
  const {
    name,
    displayOrder,
    active,
    pricingStructure,
    fields,
    description,
  } = req.body;

  // 🔒 Avoid duplicate entries
  const existing = await ProductLine.findOne({ name });
  if (existing) throw new AppError("Product line with this name already exists", 400);

  // Validate pricing structure
  if (!pricingStructure || !pricingStructure.type) {
    throw new AppError("Pricing structure is required", 400);
  }

  if (pricingStructure.type === 'variants' && (!pricingStructure.variantLabels || pricingStructure.variantLabels.length === 0)) {
    throw new AppError("Variant labels are required for variants pricing structure", 400);
  }

  if (pricingStructure.type === 'multi-type' && (!pricingStructure.typeLabels || pricingStructure.typeLabels.length === 0)) {
    throw new AppError("Type labels are required for multi-type pricing structure", 400);
  }

  const productLine = await ProductLine.create({
    name,
    displayOrder: displayOrder ?? 0,
    active: active ?? true,
    pricingStructure,
    fields: fields ?? [],
    description,
  });

  res.status(201).json(productLine);
});

// ✏️ Update product line
export const updateProductLine = asyncHandler(async (req, res) => {
  const {
    name,
    displayOrder,
    active,
    pricingStructure,
    fields,
    description,
  } = req.body;

  // Check if name already exists (excluding current product line)
  if (name) {
    const existing = await ProductLine.findOne({
      name,
      _id: { $ne: req.params.id }
    });
    if (existing) throw new AppError("Product line with this name already exists", 400);
  }

  // Validate pricing structure if provided
  if (pricingStructure) {
    if (pricingStructure.type === 'variants' && (!pricingStructure.variantLabels || pricingStructure.variantLabels.length === 0)) {
      throw new AppError("Variant labels are required for variants pricing structure", 400);
    }

    if (pricingStructure.type === 'multi-type' && (!pricingStructure.typeLabels || pricingStructure.typeLabels.length === 0)) {
      throw new AppError("Type labels are required for multi-type pricing structure", 400);
    }
  }

  const productLine = await ProductLine.findByIdAndUpdate(
    req.params.id,
    {
      name,
      displayOrder,
      active,
      pricingStructure,
      fields,
      description,
    },
    { new: true, runValidators: true }
  );

  if (!productLine) throw new AppError("Product line not found", 404);
  res.json(productLine);
});

// 🟢 Toggle product line active/inactive
export const toggleProductLineStatus = asyncHandler(async (req, res) => {
  const { active } = req.body;
  const productLine = await ProductLine.findByIdAndUpdate(
    req.params.id,
    { active },
    { new: true }
  );
  if (!productLine) throw new AppError("Product line not found", 404);
  res.json({
    message: `Product line ${active ? "activated" : "deactivated"}`,
    productLine,
  });
});

// ❌ Delete product line
export const deleteProductLine = asyncHandler(async (req, res) => {
  // TODO: Check if any products are using this product line before deleting
  // For now, we'll just delete it
  const productLine = await ProductLine.findByIdAndDelete(req.params.id);
  if (!productLine) throw new AppError("Product line not found", 404);
  res.json({ message: "Product line deleted successfully" });
});

// 🔄 Reorder product lines
export const reorderProductLines = asyncHandler(async (req, res) => {
  const { order } = req.body; // Array of { id, displayOrder }

  if (!Array.isArray(order)) throw new AppError("Order must be an array", 400);

  // Update all product lines with new display order
  const updatePromises = order.map(({ id, displayOrder }) =>
    ProductLine.findByIdAndUpdate(id, { displayOrder })
  );

  await Promise.all(updatePromises);

  const productLines = await ProductLine.find().sort({ displayOrder: 1 });
  res.json({ message: "Product lines reordered successfully", productLines });
});
