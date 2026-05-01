// delivery order controller
// src/controllers/deliveryOrderController.ts
import { DeliveryOrder } from "../models/DeliveryOrder";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// GET /api/delivery-order?repId=...&date=...
export const getDeliveryOrder = asyncHandler(async (req, res) => {
  const { repId, date } = req.query;

  if (!repId || !date) throw new AppError("repId and date are required", 400);

  const doc = await DeliveryOrder.findOne({ repId, date }).lean();

  res.json({ order: doc?.order || [] });
});

// PUT /api/delivery-order
export const saveDeliveryOrder = asyncHandler(async (req, res) => {
  const { repId, date, order } = req.body;

  if (!repId || !date || !Array.isArray(order)) {
    throw new AppError("repId, date, and order array are required", 400);
  }

  const doc = await DeliveryOrder.findOneAndUpdate(
    { repId, date },
    { order },
    { new: true, upsert: true, runValidators: true }
  );

  res.json({ message: "Delivery order saved", order: doc.order });
});
