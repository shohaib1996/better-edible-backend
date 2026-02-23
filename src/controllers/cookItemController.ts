import { Request, Response } from "express";
import { CookItem } from "../models/CookItem";

// ─────────────────────────────
// Get All Cook Items
// ─────────────────────────────

export const getAllCookItems = async (req: Request, res: Response) => {
  try {
    const {
      status,
      orderId,
      customerId,
      privateLabOrderId,
      page = 1,
      limit = 20,
    } = req.query;

    const query: any = {};

    if (status) query.status = status;
    if (orderId) query.orderId = orderId;
    if (customerId) query.customerId = customerId;
    if (privateLabOrderId) query.privateLabOrderId = privateLabOrderId;

    const skip = (Number(page) - 1) * Number(limit);

    const [cookItems, total] = await Promise.all([
      CookItem.find(query)
        .populate("labelId")
        .populate("privateLabOrderId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      CookItem.countDocuments(query),
    ]);

    res.json({ total, page: Number(page), limit: Number(limit), cookItems });
  } catch (error) {
    res.status(500).json({ message: "Error fetching cook items", error });
  }
};

// ─────────────────────────────
// Get Cook Item by ID
// ─────────────────────────────

export const getCookItemById = async (req: Request, res: Response) => {
  try {
    const cookItem = await CookItem.findById(req.params.id)
      .populate("labelId")
      .populate("privateLabOrderId");

    if (!cookItem) return res.status(404).json({ message: "Cook item not found" });

    res.json(cookItem);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cook item", error });
  }
};

// ─────────────────────────────
// Get Cook Item by cookItemId
// ─────────────────────────────

export const getCookItemByCookItemId = async (req: Request, res: Response) => {
  try {
    const cookItem = await CookItem.findOne({ cookItemId: req.params.cookItemId })
      .populate("labelId")
      .populate("privateLabOrderId");

    if (!cookItem) return res.status(404).json({ message: "Cook item not found" });

    res.json(cookItem);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cook item", error });
  }
};

// ─────────────────────────────
// Create Cook Item
// ─────────────────────────────

export const createCookItem = async (req: Request, res: Response) => {
  try {
    const { cookItemId } = req.body;

    const existing = await CookItem.findOne({ cookItemId });
    if (existing) {
      return res.status(400).json({ message: "Cook item with this ID already exists" });
    }

    const cookItem = await CookItem.create(req.body);
    res.status(201).json({ message: "Cook item created successfully", cookItem });
  } catch (error) {
    res.status(500).json({ message: "Error creating cook item", error });
  }
};

// ─────────────────────────────
// Update Cook Item
// ─────────────────────────────

export const updateCookItem = async (req: Request, res: Response) => {
  try {
    const cookItem = await CookItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!cookItem) return res.status(404).json({ message: "Cook item not found" });

    res.json({ message: "Cook item updated successfully", cookItem });
  } catch (error) {
    res.status(500).json({ message: "Error updating cook item", error });
  }
};

// ─────────────────────────────
// Update Cook Item Status
// ─────────────────────────────

export const updateCookItemStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });

    const cookItem = await CookItem.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!cookItem) return res.status(404).json({ message: "Cook item not found" });

    res.json({ message: `Cook item moved to ${status}`, cookItem });
  } catch (error) {
    res.status(500).json({ message: "Error updating cook item status", error });
  }
};

// ─────────────────────────────
// Delete Cook Item
// ─────────────────────────────

export const deleteCookItem = async (req: Request, res: Response) => {
  try {
    const cookItem = await CookItem.findByIdAndDelete(req.params.id);
    if (!cookItem) return res.status(404).json({ message: "Cook item not found" });

    res.json({ message: "Cook item deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting cook item", error });
  }
};
