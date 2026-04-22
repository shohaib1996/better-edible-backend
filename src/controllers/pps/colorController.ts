import { ProductColor } from "../../models/ProductColor";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function generateColorId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `COL-${slug}-${rand}`;
}

// ─────────────────────────────────────────────────────────
// getColors
// GET /api/colors
// ─────────────────────────────────────────────────────────

export const getColors = asyncHandler(async (req, res) => {
  const { isActive } = req.query;

  const filter: Record<string, any> = {};
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const colors = await ProductColor.find(filter).sort({ name: 1 }).lean();

  res.json({ success: true, total: colors.length, colors });
});

// ─────────────────────────────────────────────────────────
// createColor
// POST /api/colors
// ─────────────────────────────────────────────────────────

export const createColor = asyncHandler(async (req, res) => {
  const { name, hexPreview, defaultAmount } = req.body;

  if (!name) throw new AppError("name is required", 400);

  const existing = await ProductColor.findOne({
    name: { $regex: `^${name}$`, $options: "i" },
  });
  if (existing) throw new AppError(`Color "${name}" already exists`, 409);

  const colorId = generateColorId(name);

  const color = await ProductColor.create({
    colorId,
    name,
    hexPreview: hexPreview ?? undefined,
    defaultAmount: defaultAmount ?? undefined,
    isActive: true,
  });

  res.status(201).json({ success: true, color });
});

// ─────────────────────────────────────────────────────────
// toggleColor
// PATCH /api/colors/:colorId/toggle
// ─────────────────────────────────────────────────────────

export const toggleColor = asyncHandler(async (req, res) => {
  const { colorId } = req.params;

  const color = await ProductColor.findOne({ colorId });
  if (!color) throw new AppError("Color not found", 404);

  color.isActive = !color.isActive;
  await color.save();

  res.json({ success: true, color });
});

// ─────────────────────────────────────────────────────────
// deleteColor
// DELETE /api/colors/:colorId
// ─────────────────────────────────────────────────────────

export const deleteColor = asyncHandler(async (req, res) => {
  const { colorId } = req.params;

  const color = await ProductColor.findOne({ colorId });
  if (!color) throw new AppError("Color not found", 404);

  await color.deleteOne();

  res.json({ success: true, message: `Color "${color.name}" deleted` });
});

// ─────────────────────────────────────────────────────────
// updateColor
// PATCH /api/colors/:colorId
// Body: { name?, hexPreview?, defaultAmount? }
// ─────────────────────────────────────────────────────────

export const updateColor = asyncHandler(async (req, res) => {
  const { colorId } = req.params;
  const { name, hexPreview, defaultAmount } = req.body;

  const color = await ProductColor.findOne({ colorId });
  if (!color) throw new AppError("Color not found", 404);

  if (name !== undefined) color.name = name;
  if (hexPreview !== undefined) color.hexPreview = hexPreview;
  if (defaultAmount !== undefined) color.defaultAmount = defaultAmount;

  await color.save();

  res.json({ success: true, color });
});
