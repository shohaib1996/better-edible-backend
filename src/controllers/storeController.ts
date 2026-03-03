// src/controllers/storeController.ts
import { Store } from "../models/Store";
import "../models/Contact"; // Ensure Contact model is registered
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// Get all stores (with search & pagination)
export const getAllStores = asyncHandler(async (req, res) => {
  const {
    search,
    page = 1,
    limit = 20,
    repId,
    paymentStatus,
    isDue,
    sortOrder = "asc", // asc or desc
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

  // Fetch all stores matching the query (we'll sort in-memory for complex sorting)
  const allStores = await Store.find(query)
    .populate("rep", "name repType territory")
    .populate({
      path: "contacts",
      select: "name role email phone importantToKnow",
    })
    .lean(); // ← return plain JS objects (recommended)

  // Sort stores alphabetically (numbers first, then A-Z)
  const sortedStores = allStores.sort((a: any, b: any) => {
    // Trim and clean the names to remove extra spaces
    const nameA = (a.name || "").trim();
    const nameB = (b.name || "").trim();

    // Check if names start with numbers (0-9)
    const startsWithNumberA = /^[0-9]/.test(nameA);
    const startsWithNumberB = /^[0-9]/.test(nameB);

    // Numbers come first in ascending, last in descending
    if (sortOrder === "asc") {
      if (startsWithNumberA && !startsWithNumberB) return -1;
      if (!startsWithNumberA && startsWithNumberB) return 1;
      // Both are numbers or both are letters, sort alphabetically (case-insensitive)
      return nameA.localeCompare(nameB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    } else {
      if (startsWithNumberA && !startsWithNumberB) return 1;
      if (!startsWithNumberA && startsWithNumberB) return -1;
      // Both are numbers or both are letters, sort reverse alphabetically (case-insensitive)
      return nameB.localeCompare(nameA, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }
  });

  // Apply pagination after sorting
  const startIndex = (+page - 1) * +limit;
  const endIndex = startIndex + +limit;
  const stores = sortedStores.slice(startIndex, endIndex);

  const total = allStores.length;

  res.json({ total, page: +page, limit: +limit, stores });
});

// Get store by ID
export const getStoreById = asyncHandler(async (req, res) => {
  const store = await Store.findById(req.params.id)
    .populate("rep", "name repType")
    .populate("contacts");
  if (!store) throw new AppError("Store not found", 404);
  res.json(store);
});

// Create store
export const createStore = asyncHandler(async (req, res) => {
  const { name, address, city, rep, state, zipCode, terms, groups } =
    req.body;
  const existing = await Store.findOne({ name });
  if (existing) throw new AppError("Store already exists", 400);

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
});

// Update store
export const updateStore = asyncHandler(async (req, res) => {
  const store = await Store.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!store) throw new AppError("Store not found", 404);
  res.json(store);
});

// Block / Unblock store
export const toggleBlockStore = asyncHandler(async (req, res) => {
  const { blocked } = req.body;
  const store = await Store.findByIdAndUpdate(
    req.params.id,
    { blocked },
    { new: true }
  );
  if (!store) throw new AppError("Store not found", 404);
  res.json({
    message: `Store ${blocked ? "blocked" : "unblocked"} successfully`,
    store,
  });
});

// Delete store
export const deleteStore = asyncHandler(async (req, res) => {
  const store = await Store.findByIdAndDelete(req.params.id);
  if (!store) throw new AppError("Store not found", 404);
  res.json({ message: "Store deleted successfully" });
});

// Assign rep to multiple stores
export const assignRepToStores = asyncHandler(async (req, res) => {
  const { storeIds, repId } = req.body;
  await Store.updateMany({ _id: { $in: storeIds } }, { rep: repId });
  res.json({ message: "Rep assigned to stores successfully" });
});

// Block / Unblock multiple stores
export const toggleBlockStores = asyncHandler(async (req, res) => {
  const { storeIds, blocked } = req.body;
  await Store.updateMany({ _id: { $in: storeIds } }, { blocked });
  res.json({
    message: `Stores ${blocked ? "blocked" : "unblocked"} successfully`,
  });
});
