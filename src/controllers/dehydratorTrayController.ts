import { Request, Response } from "express";
import { DehydratorTray } from "../models/DehydratorTray";

// ─────────────────────────────
// Get All Dehydrator Trays
// ─────────────────────────────

export const getAllDehydratorTrays = async (req: Request, res: Response) => {
  try {
    const { status, currentDehydratorUnitId, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (currentDehydratorUnitId) query.currentDehydratorUnitId = currentDehydratorUnitId;

    const skip = (Number(page) - 1) * Number(limit);

    const [trays, total] = await Promise.all([
      DehydratorTray.find(query)
        .sort({ trayId: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      DehydratorTray.countDocuments(query),
    ]);

    res.json({ total, page: Number(page), limit: Number(limit), trays });
  } catch (error) {
    res.status(500).json({ message: "Error fetching dehydrator trays", error });
  }
};

// ─────────────────────────────
// Get Dehydrator Tray by ID
// ─────────────────────────────

export const getDehydratorTrayById = async (req: Request, res: Response) => {
  try {
    const tray = await DehydratorTray.findById(req.params.id);
    if (!tray) return res.status(404).json({ message: "Dehydrator tray not found" });

    res.json(tray);
  } catch (error) {
    res.status(500).json({ message: "Error fetching dehydrator tray", error });
  }
};

// ─────────────────────────────
// Get Dehydrator Tray by trayId
// ─────────────────────────────

export const getDehydratorTrayByTrayId = async (req: Request, res: Response) => {
  try {
    const tray = await DehydratorTray.findOne({ trayId: req.params.trayId });
    if (!tray) return res.status(404).json({ message: "Dehydrator tray not found" });

    res.json(tray);
  } catch (error) {
    res.status(500).json({ message: "Error fetching dehydrator tray", error });
  }
};

// ─────────────────────────────
// Create Dehydrator Tray
// ─────────────────────────────

export const createDehydratorTray = async (req: Request, res: Response) => {
  try {
    const { trayId } = req.body;

    const existing = await DehydratorTray.findOne({ trayId });
    if (existing) {
      return res.status(400).json({ message: "Dehydrator tray with this ID already exists" });
    }

    const tray = await DehydratorTray.create(req.body);
    res.status(201).json({ message: "Dehydrator tray created successfully", tray });
  } catch (error) {
    res.status(500).json({ message: "Error creating dehydrator tray", error });
  }
};

// ─────────────────────────────
// Update Dehydrator Tray
// ─────────────────────────────

export const updateDehydratorTray = async (req: Request, res: Response) => {
  try {
    const tray = await DehydratorTray.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!tray) return res.status(404).json({ message: "Dehydrator tray not found" });

    res.json({ message: "Dehydrator tray updated successfully", tray });
  } catch (error) {
    res.status(500).json({ message: "Error updating dehydrator tray", error });
  }
};

// ─────────────────────────────
// Delete Dehydrator Tray
// ─────────────────────────────

export const deleteDehydratorTray = async (req: Request, res: Response) => {
  try {
    const tray = await DehydratorTray.findByIdAndDelete(req.params.id);
    if (!tray) return res.status(404).json({ message: "Dehydrator tray not found" });

    res.json({ message: "Dehydrator tray deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting dehydrator tray", error });
  }
};
