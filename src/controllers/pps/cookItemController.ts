import { CookItem } from "../../models/CookItem";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";

// ─────────────────────────────
// Get All Cook Items
// ─────────────────────────────

export const getAllCookItems = asyncHandler(async (req, res) => {
  const { status, orderId, customerId, privateLabOrderId, page = 1, limit = 20 } = req.query;

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
});

// ─────────────────────────────
// Get Cook Item by ID
// ─────────────────────────────

export const getCookItemById = asyncHandler(async (req, res) => {
  const cookItem = await CookItem.findById(req.params.id)
    .populate("labelId")
    .populate("privateLabOrderId");

  if (!cookItem) throw new AppError("Cook item not found", 404);

  res.json(cookItem);
});

// ─────────────────────────────
// Get Cook Item by cookItemId
// ─────────────────────────────

export const getCookItemByCookItemId = asyncHandler(async (req, res) => {
  const cookItem = await CookItem.findOne({ cookItemId: req.params.cookItemId })
    .populate("labelId")
    .populate("privateLabOrderId");

  if (!cookItem) throw new AppError("Cook item not found", 404);

  res.json(cookItem);
});

// ─────────────────────────────
// Create Cook Item
// ─────────────────────────────

export const createCookItem = asyncHandler(async (req, res) => {
  const { cookItemId } = req.body;

  const existing = await CookItem.findOne({ cookItemId });
  if (existing) throw new AppError("Cook item with this ID already exists", 400);

  const cookItem = await CookItem.create(req.body);
  res.status(201).json({ message: "Cook item created successfully", cookItem });
});

// ─────────────────────────────
// Update Cook Item
// ─────────────────────────────

export const updateCookItem = asyncHandler(async (req, res) => {
  const cookItem = await CookItem.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!cookItem) throw new AppError("Cook item not found", 404);

  res.json({ message: "Cook item updated successfully", cookItem });
});

// ─────────────────────────────
// Update Cook Item Status
// ─────────────────────────────

export const updateCookItemStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new AppError("Status is required", 400);

  const cookItem = await CookItem.findByIdAndUpdate(req.params.id, { status }, { new: true });

  if (!cookItem) throw new AppError("Cook item not found", 404);

  res.json({ message: `Cook item moved to ${status}`, cookItem });
});

// ─────────────────────────────
// Delete Cook Item
// ─────────────────────────────

export const deleteCookItem = asyncHandler(async (req, res) => {
  const cookItem = await CookItem.findByIdAndDelete(req.params.id);
  if (!cookItem) throw new AppError("Cook item not found", 404);
  res.json({ message: "Cook item deleted successfully" });
});
