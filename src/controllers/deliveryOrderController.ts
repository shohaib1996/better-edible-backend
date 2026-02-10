// src/controllers/deliveryOrderController.ts
import { Request, Response } from "express";
import { DeliveryOrder } from "../models/DeliveryOrder";

// GET /api/delivery-order?repId=...&date=...
export const getDeliveryOrder = async (req: Request, res: Response) => {
  try {
    const { repId, date } = req.query;

    if (!repId || !date) {
      return res
        .status(400)
        .json({ message: "repId and date are required" });
    }

    const doc = await DeliveryOrder.findOne({
      repId,
      date,
    }).lean();

    res.json({ order: doc?.order || [] });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Failed to fetch delivery order", error: error.message });
  }
};

// PUT /api/delivery-order
export const saveDeliveryOrder = async (req: Request, res: Response) => {
  try {
    const { repId, date, order } = req.body;

    if (!repId || !date || !Array.isArray(order)) {
      return res
        .status(400)
        .json({ message: "repId, date, and order array are required" });
    }

    const doc = await DeliveryOrder.findOneAndUpdate(
      { repId, date },
      { order },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ message: "Delivery order saved", order: doc.order });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Failed to save delivery order", error: error.message });
  }
};
