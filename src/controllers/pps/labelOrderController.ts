import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import LabelOrder from "../../models/LabelOrder";
import LabelInventory from "../../models/LabelInventory";
import { Store } from "../../models/Store";
import { Label } from "../../models/Label";
import { AppError } from "../../utils/AppError";

// GET /api/pps/package-prep/orders
export const getActiveLabelOrders = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await LabelOrder.find({ status: "on_order" }).sort({ orderedAt: -1 });

    const labelIds = [...new Set(orders.map((o) => o.labelId.toString()))];
    const labels = await Label.find({ _id: { $in: labelIds } }).select("labelImages");
    const labelImageMap = new Map(
      labels.map((l) => [(l._id as any).toString(), (l as any).labelImages?.[0]?.secureUrl ?? null])
    );

    const ordersWithImage = orders.map((o) => ({
      ...o.toObject(),
      labelImageUrl: labelImageMap.get(o.labelId.toString()) ?? null,
    }));

    res.json({ success: true, orders: ordersWithImage });
  } catch (err) {
    next(err);
  }
};

// POST /api/pps/package-prep/orders
export const createLabelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storeId, labelId, quantityOrdered, notes } = req.body;

    const [store, label] = await Promise.all([Store.findById(storeId), Label.findById(labelId)]);
    if (!store) return next(new AppError("Store not found", 404));
    if (!label) return next(new AppError("Label not found", 404));

    const order = await LabelOrder.create({
      storeId: new mongoose.Types.ObjectId(storeId),
      storeName: store.name,
      labelId: new mongoose.Types.ObjectId(labelId),
      labelName: label.flavorName,
      itemId: label.itemId || "",
      quantityOrdered,
      notes,
      orderedAt: new Date(),
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

// POST /api/pps/package-prep/orders/bulk
export const bulkCreateLabelOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orders } = req.body as {
      orders: { storeId: string; labelId: string; quantityOrdered: number; notes?: string }[];
    };

    const storeIds = [...new Set(orders.map((o) => o.storeId))];
    const labelIds = [...new Set(orders.map((o) => o.labelId))];

    const [stores, labels] = await Promise.all([
      Store.find({ _id: { $in: storeIds } }),
      Label.find({ _id: { $in: labelIds } }),
    ]);

    const storeMap = new Map(stores.map((s) => [(s._id as any).toString(), s]));
    const labelMap = new Map(labels.map((l) => [(l._id as any).toString(), l]));

    const created = await Promise.all(
      orders.map(async (o) => {
        const store = storeMap.get(o.storeId);
        const label = labelMap.get(o.labelId);
        if (!store || !label) return null;

        return LabelOrder.create({
          storeId: new mongoose.Types.ObjectId(o.storeId),
          storeName: store.name,
          labelId: new mongoose.Types.ObjectId(o.labelId),
          labelName: label.flavorName,
          itemId: label.itemId || "",
          quantityOrdered: o.quantityOrdered,
          notes: o.notes,
          orderedAt: new Date(),
        });
      })
    );

    const successful = created.filter(Boolean);
    res.status(201).json({ success: true, orders: successful, count: successful.length });
  } catch (err) {
    next(err);
  }
};

// POST /api/pps/package-prep/orders/:orderId/receive
export const receiveLabelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const { quantityReceived } = req.body;

    const order = await LabelOrder.findById(orderId);
    if (!order) return next(new AppError("Label order not found", 404));
    if (order.status === "received") {
      return next(new AppError("Order has already been received", 400));
    }

    order.quantityReceived = quantityReceived;
    order.status = "received";
    await order.save();

    const inventory = await LabelInventory.findOneAndUpdate(
      { storeId: order.storeId, labelId: order.labelId },
      {
        $inc: { unprocessed: quantityReceived },
        $setOnInsert: {
          storeName: order.storeName,
          labelName: order.labelName,
          itemId: order.itemId,
        },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, order, inventory });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/pps/package-prep/orders/:orderId
export const updateLabelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    const { quantityOrdered, notes } = req.body;

    const order = await LabelOrder.findById(orderId);
    if (!order) return next(new AppError("Label order not found", 404));
    if (order.status !== "on_order") {
      return next(new AppError("Only on_order orders can be edited", 400));
    }

    if (quantityOrdered !== undefined) order.quantityOrdered = quantityOrdered;
    if (notes !== undefined) order.notes = notes;
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/pps/package-prep/orders/:orderId
export const deleteLabelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;

    const order = await LabelOrder.findById(orderId);
    if (!order) return next(new AppError("Label order not found", 404));
    if (order.status !== "on_order") {
      return next(new AppError("Only on_order orders can be deleted", 400));
    }

    await order.deleteOne();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
