import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { ClientOrder } from "../models/ClientOrder";
import { Label } from "../models/Label";
import { PrivateLabelClient } from "../models/PrivateLabelClient";
import { Types } from "mongoose";

// -------------------
// GET /api/store/orders?storeId=
// Store — get all their orders
// -------------------
export const getMyOrders = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  if (!storeId) throw new AppError("storeId is required", 400);

  const client = await PrivateLabelClient.findOne({
    store: new Types.ObjectId(storeId as string),
  });
  if (!client) {
    return res.status(200).json({ success: true, orders: [] });
  }

  const orders = await ClientOrder.find({ client: client._id })
    .populate("items.label", "flavorName itemId currentStage")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, orders });
});

// -------------------
// POST /api/store/orders
// Store — place a new order (approved labels only)
// -------------------
export const placeOrder = asyncHandler(async (req, res) => {
  const { storeId, items, deliveryDate } = req.body;

  if (!storeId) throw new AppError("storeId is required", 400);
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError("items array is required and must not be empty", 400);
  }
  if (!deliveryDate) throw new AppError("deliveryDate is required", 400);

  const client = await PrivateLabelClient.findOne({
    store: new Types.ObjectId(storeId),
  });
  if (!client) throw new AppError("No private label client found for this store", 404);
  if (client.status !== "active") {
    throw new AppError("Your account must be active before placing orders", 400);
  }

  // Validate each label — must be ready_for_production
  const labelIds = items.map((i: { labelId: string }) => new Types.ObjectId(i.labelId));
  const labels = await Label.find({ _id: { $in: labelIds } });

  const labelMap: Record<string, (typeof labels)[0]> = {};
  for (const l of labels) labelMap[String(l._id)] = l;

  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const label = labelMap[item.labelId];
    if (!label) throw new AppError(`Label ${item.labelId} not found`, 404);
    if (label.currentStage !== "ready_for_production") {
      throw new AppError(`Label "${label.flavorName}" is not yet approved for ordering`, 400);
    }

    const quantity = parseInt(item.quantity, 10);
    if (!quantity || quantity < 1) {
      throw new AppError(`Invalid quantity for label "${label.flavorName}"`, 400);
    }

    const unitPrice = label.unitCost ?? 0;
    const lineTotal = parseFloat((unitPrice * quantity).toFixed(2));
    subtotal += lineTotal;

    orderItems.push({
      label: label._id,
      flavorName: label.flavorName,
      productType: label.productType,
      quantity,
      unitPrice,
      lineTotal,
    });
  }

  const total = parseFloat(subtotal.toFixed(2));

  const order = await ClientOrder.create({
    client: client._id,
    assignedRep: client.assignedRep,
    status: "waiting",
    deliveryDate: new Date(deliveryDate),
    items: orderItems,
    subtotal,
    total,
    createdBy: { userType: "store" },
  });

  // calculateProductionStart is a method on the model
  order.calculateProductionStart();
  await order.save();

  res.status(201).json({ success: true, order });
});
