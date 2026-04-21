import { DehydratorTray } from "../../models/DehydratorTray";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";

// ─────────────────────────────
// Get All Dehydrator Trays
// ─────────────────────────────

export const getAllDehydratorTrays = asyncHandler(async (req, res) => {
  const { status, currentDehydratorUnitId, page = 1, limit = 20 } = req.query;

  const query: any = {};
  if (status) query.status = status;
  if (currentDehydratorUnitId) query.currentDehydratorUnitId = currentDehydratorUnitId;

  const skip = (Number(page) - 1) * Number(limit);

  const [trays, total] = await Promise.all([
    DehydratorTray.find(query).sort({ trayId: 1 }).skip(skip).limit(Number(limit)).lean(),
    DehydratorTray.countDocuments(query),
  ]);

  res.json({ total, page: Number(page), limit: Number(limit), trays });
});

// ─────────────────────────────
// Get Dehydrator Tray by ID
// ─────────────────────────────

export const getDehydratorTrayById = asyncHandler(async (req, res) => {
  const tray = await DehydratorTray.findById(req.params.id);
  if (!tray) throw new AppError("Dehydrator tray not found", 404);
  res.json(tray);
});

// ─────────────────────────────
// Get Dehydrator Tray by trayId
// ─────────────────────────────

export const getDehydratorTrayByTrayId = asyncHandler(async (req, res) => {
  const tray = await DehydratorTray.findOne({ trayId: req.params.trayId });
  if (!tray) throw new AppError("Dehydrator tray not found", 404);
  res.json(tray);
});

// ─────────────────────────────
// Create Dehydrator Tray
// ─────────────────────────────

export const createDehydratorTray = asyncHandler(async (req, res) => {
  const { trayId } = req.body;

  const existing = await DehydratorTray.findOne({ trayId });
  if (existing) throw new AppError("Dehydrator tray with this ID already exists", 400);

  const tray = await DehydratorTray.create(req.body);
  res.status(201).json({ message: "Dehydrator tray created successfully", tray });
});

// ─────────────────────────────
// Update Dehydrator Tray
// ─────────────────────────────

export const updateDehydratorTray = asyncHandler(async (req, res) => {
  const tray = await DehydratorTray.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!tray) throw new AppError("Dehydrator tray not found", 404);

  res.json({ message: "Dehydrator tray updated successfully", tray });
});

// ─────────────────────────────
// Delete Dehydrator Tray
// ─────────────────────────────

export const deleteDehydratorTray = asyncHandler(async (req, res) => {
  const tray = await DehydratorTray.findByIdAndDelete(req.params.id);
  if (!tray) throw new AppError("Dehydrator tray not found", 404);
  res.json({ message: "Dehydrator tray deleted successfully" });
});
