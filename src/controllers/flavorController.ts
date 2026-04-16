import { Flavor } from "../models/Flavor";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function generateFlavorId(name: string, isBlend: boolean): string {
  const prefix = isBlend ? "BL" : "FL";
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${slug}-${rand}`;
}

// ─────────────────────────────────────────────────────────
// getFlavors
// GET /api/flavors
// ─────────────────────────────────────────────────────────

export const getFlavors = asyncHandler(async (req, res) => {
  const { isActive, isBlend } = req.query;

  const filter: Record<string, any> = {};
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (isBlend !== undefined) filter.isBlend = isBlend === "true";

  const flavors = await Flavor.find(filter).sort({ name: 1 }).lean();

  res.json({ success: true, total: flavors.length, flavors });
});

// ─────────────────────────────────────────────────────────
// createFlavor
// POST /api/flavors
// ─────────────────────────────────────────────────────────

export const createFlavor = asyncHandler(async (req, res) => {
  const { name, defaultAmount } = req.body;

  if (!name) throw new AppError("name is required", 400);

  const existing = await Flavor.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
  if (existing) throw new AppError(`Flavor "${name}" already exists`, 409);

  const flavorId = generateFlavorId(name, false);

  const flavor = await Flavor.create({
    flavorId,
    name,
    isBlend: false,
    blendOf: [],
    defaultAmount: defaultAmount ?? undefined,
    isActive: true,
  });

  res.status(201).json({ success: true, flavor });
});

// ─────────────────────────────────────────────────────────
// findOrCreateBlend
// POST /api/flavors/blend
// Body: { blendOf: string[], name?: string, defaultAmount?: number }
// ─────────────────────────────────────────────────────────

export const findOrCreateBlend = asyncHandler(async (req, res) => {
  const { blendOf, name, defaultAmount } = req.body;

  if (!Array.isArray(blendOf) || blendOf.length < 2) {
    throw new AppError("blendOf must be an array of at least 2 flavorIds", 400);
  }

  const sorted = [...blendOf].sort();

  // Check all parent flavors exist
  const parents = await Flavor.find({ flavorId: { $in: sorted }, isActive: true }).lean();
  if (parents.length !== sorted.length) {
    throw new AppError("One or more parent flavors not found or inactive", 400);
  }

  // Look for existing blend with the exact same composition
  const existing = await Flavor.findOne({
    isBlend: true,
    blendOf: { $size: sorted.length, $all: sorted },
  }).lean();

  if (existing) {
    return res.json({ success: true, created: false, flavor: existing });
  }

  // Auto-generate name from parent names if not provided
  const blendName =
    name?.trim() ||
    parents
      .sort((a, b) => sorted.indexOf(a.flavorId) - sorted.indexOf(b.flavorId))
      .map((f) => f.name)
      .join(" + ");

  const flavorId = generateFlavorId(blendName, true);

  const blend = await Flavor.create({
    flavorId,
    name: blendName,
    isBlend: true,
    blendOf: sorted,
    defaultAmount: defaultAmount ?? undefined,
    isActive: true,
  });

  res.status(201).json({ success: true, created: true, flavor: blend });
});

// ─────────────────────────────────────────────────────────
// toggleFlavor
// PATCH /api/flavors/:flavorId/toggle
// ─────────────────────────────────────────────────────────

export const toggleFlavor = asyncHandler(async (req, res) => {
  const { flavorId } = req.params;

  const flavor = await Flavor.findOne({ flavorId });
  if (!flavor) throw new AppError("Flavor not found", 404);

  flavor.isActive = !flavor.isActive;
  await flavor.save();

  res.json({ success: true, flavor });
});

// ─────────────────────────────────────────────────────────
// updateFlavor
// PATCH /api/flavors/:flavorId
// Body: { name?, defaultAmount? }
// ─────────────────────────────────────────────────────────

export const updateFlavor = asyncHandler(async (req, res) => {
  const { flavorId } = req.params;
  const { name, defaultAmount } = req.body;

  const flavor = await Flavor.findOne({ flavorId });
  if (!flavor) throw new AppError("Flavor not found", 404);

  if (name !== undefined) flavor.name = name;
  if (defaultAmount !== undefined) flavor.defaultAmount = defaultAmount;

  await flavor.save();

  res.json({ success: true, flavor });
});
