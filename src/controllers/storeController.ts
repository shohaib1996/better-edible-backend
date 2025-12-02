// src/controllers/storeController.ts
import { Request, Response } from "express";
import { Store } from "../models/Store";
import { Contact } from "../models/Contact"; // Ensure Contact model is registered

// Get all stores (with search & pagination)
export const getAllStores = async (req: Request, res: Response) => {
  try {
    const {
      search,
      page = 1,
      limit = 20,
      repId,
      paymentStatus,
      isDue,
    } = req.query;
    const query: any = {};

    if (search) {
      query.name = { $regex: search as string, $options: "i" };
    }
    if (repId) query.rep = repId;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (isDue === "true") query.dueAmount = { $gt: 0 };

    // Handle paymentStatus filtering by querying lastPaidAt
    if (paymentStatus) {
      const today = new Date();

      if (paymentStatus === "green") {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        query.lastPaidAt = { $gte: sevenDaysAgo };
      } else if (paymentStatus === "yellow") {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        query.lastPaidAt = {
          $lt: sevenDaysAgo,
          $gte: thirtyDaysAgo,
        };
      } else if (paymentStatus === "red") {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        query.$or = [
          { lastPaidAt: { $lt: thirtyDaysAgo } },
          { lastPaidAt: { $exists: false } },
        ];
      }
    }

    const stores = await Store.find(query)
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .sort({ createdAt: -1, _id: 1 })
      .populate("rep", "name repType territory")
      .populate({
        path: "contacts",
        select: "name role email phone importantToKnow",
      })
      .lean(); // ← return plain JS objects (recommended)

    const total = await Store.countDocuments(query);

    res.json({ total, page: +page, limit: +limit, stores });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stores", error });
  }
};

// Get store by ID
export const getStoreById = async (req: Request, res: Response) => {
  try {
    const store = await Store.findById(req.params.id)
      .populate("rep", "name repType")
      .populate("contacts");
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json(store);
  } catch (error) {
    res.status(500).json({ message: "Error fetching store", error });
  }
};

// Create store
export const createStore = async (req: Request, res: Response) => {
  try {
    const { name, address, city, rep, state, zipCode, terms, groups } =
      req.body;
    const existing = await Store.findOne({ name });
    if (existing)
      return res.status(400).json({ message: "Store already exists" });

    const store = await Store.create({
      name,
      address,
      city,
      rep,
      state,
      zipCode,
      terms,
      groups,
    });
    res.status(201).json(store);
  } catch (error) {
    res.status(500).json({ message: "Error creating store", error });
  }
};

// Update store
export const updateStore = async (req: Request, res: Response) => {
  try {
    const store = await Store.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json(store);
  } catch (error) {
    res.status(500).json({ message: "Error updating store", error });
  }
};

// Block / Unblock store
export const toggleBlockStore = async (req: Request, res: Response) => {
  try {
    const { blocked } = req.body;
    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { blocked },
      { new: true }
    );
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json({
      message: `Store ${blocked ? "blocked" : "unblocked"} successfully`,
      store,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating store block status", error });
  }
};

// Delete store
export const deleteStore = async (req: Request, res: Response) => {
  try {
    const store = await Store.findByIdAndDelete(req.params.id);
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json({ message: "Store deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting store", error });
  }
};

// Assign rep to multiple stores
export const assignRepToStores = async (req: Request, res: Response) => {
  try {
    const { storeIds, repId } = req.body;
    await Store.updateMany({ _id: { $in: storeIds } }, { rep: repId });
    res.json({ message: "Rep assigned to stores successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error assigning rep to stores", error });
  }
};

// Block / Unblock multiple stores
export const toggleBlockStores = async (req: Request, res: Response) => {
  try {
    const { storeIds, blocked } = req.body;
    await Store.updateMany({ _id: { $in: storeIds } }, { blocked });
    res.json({
      message: `Stores ${blocked ? "blocked" : "unblocked"} successfully`,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating store block status", error });
  }
};
