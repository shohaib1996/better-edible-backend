import { Request, Response } from "express";
import { ProductLine } from "../models/ProductLine";

// 🔍 Get all product lines
export const getAllProductLines = async (req: Request, res: Response) => {
  try {
    const productLines = await ProductLine.find().sort({ displayOrder: 1 });
    const total = await ProductLine.countDocuments();
    res.json({ total, productLines });
  } catch (error) {
    res.status(500).json({ message: "Error fetching product lines", error });
  }
};

// 🔍 Get active product lines only
export const getActiveProductLines = async (req: Request, res: Response) => {
  try {
    const productLines = await ProductLine.find({ active: true }).sort({ displayOrder: 1 });
    res.json({ productLines });
  } catch (error) {
    res.status(500).json({ message: "Error fetching active product lines", error });
  }
};

// 🧾 Get single product line
export const getProductLineById = async (req: Request, res: Response) => {
  try {
    const productLine = await ProductLine.findById(req.params.id);
    if (!productLine) return res.status(404).json({ message: "Product line not found" });
    res.json(productLine);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product line", error });
  }
};

// 🧾 Get product line by name
export const getProductLineByName = async (req: Request, res: Response) => {
  try {
    const productLine = await ProductLine.findOne({ name: req.params.name });
    if (!productLine) return res.status(404).json({ message: "Product line not found" });
    res.json(productLine);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product line", error });
  }
};

// ➕ Create product line
export const createProductLine = async (req: Request, res: Response) => {
  try {
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
    if (existing) {
      return res.status(400).json({ message: "Product line with this name already exists" });
    }

    // Validate pricing structure
    if (!pricingStructure || !pricingStructure.type) {
      return res.status(400).json({ message: "Pricing structure is required" });
    }

    if (pricingStructure.type === 'variants' && (!pricingStructure.variantLabels || pricingStructure.variantLabels.length === 0)) {
      return res.status(400).json({ message: "Variant labels are required for variants pricing structure" });
    }

    if (pricingStructure.type === 'multi-type' && (!pricingStructure.typeLabels || pricingStructure.typeLabels.length === 0)) {
      return res.status(400).json({ message: "Type labels are required for multi-type pricing structure" });
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
  } catch (error) {
    res.status(500).json({ message: "Error creating product line", error });
  }
};

// ✏️ Update product line
export const updateProductLine = async (req: Request, res: Response) => {
  try {
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
      if (existing) {
        return res.status(400).json({ message: "Product line with this name already exists" });
      }
    }

    // Validate pricing structure if provided
    if (pricingStructure) {
      if (pricingStructure.type === 'variants' && (!pricingStructure.variantLabels || pricingStructure.variantLabels.length === 0)) {
        return res.status(400).json({ message: "Variant labels are required for variants pricing structure" });
      }

      if (pricingStructure.type === 'multi-type' && (!pricingStructure.typeLabels || pricingStructure.typeLabels.length === 0)) {
        return res.status(400).json({ message: "Type labels are required for multi-type pricing structure" });
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

    if (!productLine) return res.status(404).json({ message: "Product line not found" });
    res.json(productLine);
  } catch (error) {
    res.status(500).json({ message: "Error updating product line", error });
  }
};

// 🟢 Toggle product line active/inactive
export const toggleProductLineStatus = async (req: Request, res: Response) => {
  try {
    const { active } = req.body;
    const productLine = await ProductLine.findByIdAndUpdate(
      req.params.id,
      { active },
      { new: true }
    );
    if (!productLine) return res.status(404).json({ message: "Product line not found" });
    res.json({
      message: `Product line ${active ? "activated" : "deactivated"}`,
      productLine,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating product line status", error });
  }
};

// ❌ Delete product line
export const deleteProductLine = async (req: Request, res: Response) => {
  try {
    // TODO: Check if any products are using this product line before deleting
    // For now, we'll just delete it
    const productLine = await ProductLine.findByIdAndDelete(req.params.id);
    if (!productLine) return res.status(404).json({ message: "Product line not found" });
    res.json({ message: "Product line deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product line", error });
  }
};

// 🔄 Reorder product lines
export const reorderProductLines = async (req: Request, res: Response) => {
  try {
    const { order } = req.body; // Array of { id, displayOrder }

    if (!Array.isArray(order)) {
      return res.status(400).json({ message: "Order must be an array" });
    }

    // Update all product lines with new display order
    const updatePromises = order.map(({ id, displayOrder }) =>
      ProductLine.findByIdAndUpdate(id, { displayOrder })
    );

    await Promise.all(updatePromises);

    const productLines = await ProductLine.find().sort({ displayOrder: 1 });
    res.json({ message: "Product lines reordered successfully", productLines });
  } catch (error) {
    res.status(500).json({ message: "Error reordering product lines", error });
  }
};
