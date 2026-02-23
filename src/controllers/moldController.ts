import { Request, Response } from "express";
import { Mold } from "../models/Mold";

// ─────────────────────────────
// Get All Molds
// ─────────────────────────────

export const getAllMolds = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [molds, total] = await Promise.all([
      Mold.find(query)
        .sort({ moldId: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Mold.countDocuments(query),
    ]);

    res.json({ total, page: Number(page), limit: Number(limit), molds });
  } catch (error) {
    res.status(500).json({ message: "Error fetching molds", error });
  }
};

// ─────────────────────────────
// Get Mold by ID
// ─────────────────────────────

export const getMoldById = async (req: Request, res: Response) => {
  try {
    const mold = await Mold.findById(req.params.id);
    if (!mold) return res.status(404).json({ message: "Mold not found" });

    res.json(mold);
  } catch (error) {
    res.status(500).json({ message: "Error fetching mold", error });
  }
};

// ─────────────────────────────
// Get Mold by moldId
// ─────────────────────────────

export const getMoldByMoldId = async (req: Request, res: Response) => {
  try {
    const mold = await Mold.findOne({ moldId: req.params.moldId });
    if (!mold) return res.status(404).json({ message: "Mold not found" });

    res.json(mold);
  } catch (error) {
    res.status(500).json({ message: "Error fetching mold", error });
  }
};

// ─────────────────────────────
// Create Mold
// ─────────────────────────────

export const createMold = async (req: Request, res: Response) => {
  try {
    const { moldId } = req.body;

    const existing = await Mold.findOne({ moldId });
    if (existing) {
      return res.status(400).json({ message: "Mold with this ID already exists" });
    }

    const mold = await Mold.create(req.body);
    res.status(201).json({ message: "Mold created successfully", mold });
  } catch (error) {
    res.status(500).json({ message: "Error creating mold", error });
  }
};

// ─────────────────────────────
// Update Mold
// ─────────────────────────────

export const updateMold = async (req: Request, res: Response) => {
  try {
    const mold = await Mold.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!mold) return res.status(404).json({ message: "Mold not found" });

    res.json({ message: "Mold updated successfully", mold });
  } catch (error) {
    res.status(500).json({ message: "Error updating mold", error });
  }
};

// ─────────────────────────────
// Delete Mold
// ─────────────────────────────

export const deleteMold = async (req: Request, res: Response) => {
  try {
    const mold = await Mold.findByIdAndDelete(req.params.id);
    if (!mold) return res.status(404).json({ message: "Mold not found" });

    res.json({ message: "Mold deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting mold", error });
  }
};
