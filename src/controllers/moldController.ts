import { Mold } from "../models/Mold";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// ─────────────────────────────
// Get All Molds
// ─────────────────────────────

export const getAllMolds = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query: any = {};
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [molds, total] = await Promise.all([
    Mold.find(query).sort({ moldId: 1 }).skip(skip).limit(Number(limit)).lean(),
    Mold.countDocuments(query),
  ]);

  res.json({ total, page: Number(page), limit: Number(limit), molds });
});

// ─────────────────────────────
// Get Mold by ID
// ─────────────────────────────

export const getMoldById = asyncHandler(async (req, res) => {
  const mold = await Mold.findById(req.params.id);
  if (!mold) throw new AppError("Mold not found", 404);
  res.json(mold);
});

// ─────────────────────────────
// Get Mold by moldId
// ─────────────────────────────

export const getMoldByMoldId = asyncHandler(async (req, res) => {
  const mold = await Mold.findOne({ moldId: req.params.moldId });
  if (!mold) throw new AppError("Mold not found", 404);
  res.json(mold);
});

// ─────────────────────────────
// Create Mold
// ─────────────────────────────

export const createMold = asyncHandler(async (req, res) => {
  const { moldId } = req.body;

  const existing = await Mold.findOne({ moldId });
  if (existing) throw new AppError("Mold with this ID already exists", 400);

  const mold = await Mold.create(req.body);
  res.status(201).json({ message: "Mold created successfully", mold });
});

// ─────────────────────────────
// Update Mold
// ─────────────────────────────

export const updateMold = asyncHandler(async (req, res) => {
  const mold = await Mold.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!mold) throw new AppError("Mold not found", 404);

  res.json({ message: "Mold updated successfully", mold });
});

// ─────────────────────────────
// Delete Mold funtions
// ─────────────────────────────

export const deleteMold = asyncHandler(async (req, res) => {
  const mold = await Mold.findByIdAndDelete(req.params.id);
  if (!mold) throw new AppError("Mold not found", 404);
  res.json({ message: "Mold deleted successfully" });
});
