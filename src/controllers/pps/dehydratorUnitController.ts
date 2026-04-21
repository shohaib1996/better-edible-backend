import { DehydratorUnit } from "../../models/DehydratorUnit";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";

// ─────────────────────────────
// Get All Dehydrator Units
// ─────────────────────────────

export const getAllDehydratorUnits = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const [units, total] = await Promise.all([
    DehydratorUnit.find().sort({ unitId: 1 }).skip(skip).limit(Number(limit)).lean(),
    DehydratorUnit.countDocuments(),
  ]);

  res.json({ total, page: Number(page), limit: Number(limit), units });
});

// ─────────────────────────────
// Get Dehydrator Unit by ID
// ─────────────────────────────

export const getDehydratorUnitById = asyncHandler(async (req, res) => {
  const unit = await DehydratorUnit.findById(req.params.id);
  if (!unit) throw new AppError("Dehydrator unit not found", 404);
  res.json(unit);
});

// ─────────────────────────────
// Get Dehydrator Unit by unitId
// ─────────────────────────────

export const getDehydratorUnitByUnitId = asyncHandler(async (req, res) => {
  const unit = await DehydratorUnit.findOne({ unitId: req.params.unitId });
  if (!unit) throw new AppError("Dehydrator unit not found", 404);
  res.json(unit);
});

// ─────────────────────────────
// Create Dehydrator Unit
// ─────────────────────────────

export const createDehydratorUnit = asyncHandler(async (req, res) => {
  const { unitId } = req.body;

  const existing = await DehydratorUnit.findOne({ unitId });
  if (existing) throw new AppError("Dehydrator unit with this ID already exists", 400);

  const unit = new DehydratorUnit(req.body);
  await unit.save(); // triggers pre-save hook to initialize shelves

  res.status(201).json({ message: "Dehydrator unit created successfully", unit });
});

// ─────────────────────────────
// Update Dehydrator Unit
// ─────────────────────────────

export const updateDehydratorUnit = asyncHandler(async (req, res) => {
  const unit = await DehydratorUnit.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!unit) throw new AppError("Dehydrator unit not found", 404);

  res.json({ message: "Dehydrator unit updated successfully", unit });
});

// ─────────────────────────────
// Update Shelf in Dehydrator Unit
// ─────────────────────────────

export const updateShelf = asyncHandler(async (req, res) => {
  const { shelfPosition } = req.params;
  const { occupied, trayId, cookItemId } = req.body;

  const unit = await DehydratorUnit.findById(req.params.id);
  if (!unit) throw new AppError("Dehydrator unit not found", 404);

  const shelf = unit.shelves.get(shelfPosition);
  if (!shelf) throw new AppError(`Shelf position ${shelfPosition} does not exist`, 400);

  unit.shelves.set(shelfPosition, {
    occupied: occupied ?? shelf.occupied,
    trayId: trayId !== undefined ? trayId : shelf.trayId,
    cookItemId: cookItemId !== undefined ? cookItemId : shelf.cookItemId,
  });

  await unit.save();

  res.json({ message: `Shelf ${shelfPosition} updated successfully`, unit });
});

// ─────────────────────────────
// Delete Dehydrator Unit
// ─────────────────────────────

export const deleteDehydratorUnit = asyncHandler(async (req, res) => {
  const unit = await DehydratorUnit.findByIdAndDelete(req.params.id);
  if (!unit) throw new AppError("Dehydrator unit not found", 404);
  res.json({ message: "Dehydrator unit deleted successfully" });
});
