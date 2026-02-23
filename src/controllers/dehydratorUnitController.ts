import { Request, Response } from "express";
import { DehydratorUnit } from "../models/DehydratorUnit";

// ─────────────────────────────
// Get All Dehydrator Units
// ─────────────────────────────

export const getAllDehydratorUnits = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [units, total] = await Promise.all([
      DehydratorUnit.find()
        .sort({ unitId: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      DehydratorUnit.countDocuments(),
    ]);

    res.json({ total, page: Number(page), limit: Number(limit), units });
  } catch (error) {
    res.status(500).json({ message: "Error fetching dehydrator units", error });
  }
};

// ─────────────────────────────
// Get Dehydrator Unit by ID
// ─────────────────────────────

export const getDehydratorUnitById = async (req: Request, res: Response) => {
  try {
    const unit = await DehydratorUnit.findById(req.params.id);
    if (!unit) return res.status(404).json({ message: "Dehydrator unit not found" });

    res.json(unit);
  } catch (error) {
    res.status(500).json({ message: "Error fetching dehydrator unit", error });
  }
};

// ─────────────────────────────
// Get Dehydrator Unit by unitId
// ─────────────────────────────

export const getDehydratorUnitByUnitId = async (req: Request, res: Response) => {
  try {
    const unit = await DehydratorUnit.findOne({ unitId: req.params.unitId });
    if (!unit) return res.status(404).json({ message: "Dehydrator unit not found" });

    res.json(unit);
  } catch (error) {
    res.status(500).json({ message: "Error fetching dehydrator unit", error });
  }
};

// ─────────────────────────────
// Create Dehydrator Unit
// ─────────────────────────────

export const createDehydratorUnit = async (req: Request, res: Response) => {
  try {
    const { unitId } = req.body;

    const existing = await DehydratorUnit.findOne({ unitId });
    if (existing) {
      return res.status(400).json({ message: "Dehydrator unit with this ID already exists" });
    }

    const unit = new DehydratorUnit(req.body);
    await unit.save(); // triggers pre-save hook to initialize shelves

    res.status(201).json({ message: "Dehydrator unit created successfully", unit });
  } catch (error) {
    res.status(500).json({ message: "Error creating dehydrator unit", error });
  }
};

// ─────────────────────────────
// Update Dehydrator Unit
// ─────────────────────────────

export const updateDehydratorUnit = async (req: Request, res: Response) => {
  try {
    const unit = await DehydratorUnit.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!unit) return res.status(404).json({ message: "Dehydrator unit not found" });

    res.json({ message: "Dehydrator unit updated successfully", unit });
  } catch (error) {
    res.status(500).json({ message: "Error updating dehydrator unit", error });
  }
};

// ─────────────────────────────
// Update Shelf in Dehydrator Unit
// ─────────────────────────────

export const updateShelf = async (req: Request, res: Response) => {
  try {
    const { shelfPosition } = req.params;
    const { occupied, trayId, cookItemId } = req.body;

    const unit = await DehydratorUnit.findById(req.params.id);
    if (!unit) return res.status(404).json({ message: "Dehydrator unit not found" });

    const shelf = unit.shelves.get(shelfPosition);
    if (!shelf) {
      return res.status(400).json({ message: `Shelf position ${shelfPosition} does not exist` });
    }

    unit.shelves.set(shelfPosition, {
      occupied: occupied ?? shelf.occupied,
      trayId: trayId !== undefined ? trayId : shelf.trayId,
      cookItemId: cookItemId !== undefined ? cookItemId : shelf.cookItemId,
    });

    await unit.save();

    res.json({ message: `Shelf ${shelfPosition} updated successfully`, unit });
  } catch (error) {
    res.status(500).json({ message: "Error updating shelf", error });
  }
};

// ─────────────────────────────
// Delete Dehydrator Unit
// ─────────────────────────────

export const deleteDehydratorUnit = async (req: Request, res: Response) => {
  try {
    const unit = await DehydratorUnit.findByIdAndDelete(req.params.id);
    if (!unit) return res.status(404).json({ message: "Dehydrator unit not found" });

    res.json({ message: "Dehydrator unit deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting dehydrator unit", error });
  }
};
