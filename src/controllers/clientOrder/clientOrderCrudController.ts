import mongoose, { Types } from "mongoose";
import { ClientOrder, IClientOrderItem } from "../../models/ClientOrder";
import { PrivateLabelClient } from "../../models/PrivateLabelClient";
import { Label } from "../../models/Label";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { getUnitPriceByProductType, populateCreatedBy } from "./clientOrderHelpers";

// GET /api/client-orders
export const getAllClientOrders = asyncHandler(async (req, res) => {
  const { clientId, status, repId, startDate, endDate, search, page = 1, limit = 20 } = req.query;

  const filter: any = {};

  if (clientId && mongoose.Types.ObjectId.isValid(String(clientId))) {
    filter.client = new mongoose.Types.ObjectId(String(clientId));
  }
  if (status && typeof status === "string") {
    filter.status = { $in: status.split(",") };
  }
  if (repId && mongoose.Types.ObjectId.isValid(String(repId))) {
    filter.assignedRep = new mongoose.Types.ObjectId(String(repId));
  }
  if (startDate && endDate) {
    filter.deliveryDate = {
      $gte: new Date(String(startDate)),
      $lte: new Date(String(endDate)),
    };
  }

  if (search && typeof search === "string" && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    if (search.toUpperCase().startsWith("PL")) {
      filter.orderNumber = searchRegex;
    } else {
      const clients = await PrivateLabelClient.find().populate("store");
      const matchingClientIds = clients
        .filter((c: any) => c.store?.name?.toLowerCase().includes(search.toLowerCase()))
        .map((c) => c._id);
      filter.client = { $in: matchingClientIds };
    }
  }

  const skip: Date = (Number(page) - 1) * Number(limit);

  const [rawOrders, total] = await Promise.all([
    ClientOrder.find(filter)
      .populate({
        path: "client",
        populate: { path: "store", select: "name address city state storeId" },
      })
      .populate("assignedRep", "name email")
      .populate(
        "items.label",
        "flavorName productType cannabinoidMix color flavorComponents colorComponents labelImages itemId"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ClientOrder.countDocuments(filter),
  ]);

  const orders = await Promise.all(
    rawOrders.map(async (order: any) => {
      order.createdBy = await populateCreatedBy(order.createdBy);
      return order;
    })
  );

  res.json({ total, orders, page: Number(page), limit: Number(limit) });
});

// GET /api/client-orders/:id
export const getClientOrderById = asyncHandler(async (req, res) => {
  const order: any = await ClientOrder.findById(req.params.id)
    .populate({
      path: "client",
      populate: { path: "store", select: "name address city state zip storeId" },
    })
    .populate("assignedRep", "name email")
    .populate(
      "items.label",
      "flavorName productType cannabinoidMix color flavorComponents colorComponents labelImages itemId"
    )
    .lean();

  if (!order) throw new AppError("Order not found", 404);

  order.createdBy = await populateCreatedBy(order.createdBy);

  res.json(order);
});

// POST /api/client-orders
export const createClientOrder = asyncHandler(async (req, res) => {
  const {
    clientId,
    deliveryDate,
    items,
    discount = 0,
    discountType = "flat",
    note,
    shipASAP = false,
    userId,
    userType,
  } = req.body;

  const client = await PrivateLabelClient.findById(clientId);
  if (!client) throw new AppError("Client not found", 404);

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError("At least one item is required", 400);
  }

  const processedItems = await Promise.all(
    items.map(async (item: any) => {
      const label = await Label.findById(item.labelId);
      if (!label) throw new AppError(`Label ${item.labelId} not found`, 404);

      if (label.currentStage !== "ready_for_production") {
        throw new AppError(`Label "${label.flavorName}" is not ready for production`, 400);
      }
      if (label.client.toString() !== clientId.toString()) {
        throw new AppError(`Label does not belong to this client`, 400);
      }
      if (!item.quantity || item.quantity <= 0) {
        throw new AppError("Quantity must be greater than 0", 400);
      }

      const unitPrice = await getUnitPriceByProductType(label.productType);
      if (unitPrice === 0) {
        throw new AppError(
          `Product type "${label.productType}" not found or has no price set`,
          400
        );
      }

      return {
        label: label._id as Types.ObjectId,
        flavorName: label.flavorName,
        productType: label.productType,
        quantity: item.quantity,
        unitPrice,
        lineTotal: Number((item.quantity * unitPrice).toFixed(2)),
      } as IClientOrderItem;
    })
  );

  const subtotal: string = Number(processedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));

  let discountAmount: number;
  if (discountType === "percentage") {
    if (discount < 0 || discount > 100)
      throw new AppError("Percentage discount must be between 0 and 100", 400);
    discountAmount = Number(((subtotal * discount) / 100).toFixed(2));
  } else {
    if (discount < 0) throw new AppError("Discount cannot be negative", 400);
    discountAmount = Number(discount);
  }

  const total = Number(Math.max(0, subtotal - discountAmount).toFixed(2));

  const order = new ClientOrder({
    client: clientId,
    assignedRep: client.assignedRep,
    status: "waiting",
    deliveryDate: new Date(deliveryDate),
    items: processedItems,
    subtotal,
    discount,
    discountType,
    discountAmount,
    total,
    note,
    isRecurring: false,
    shipASAP,
    createdBy: userId ? { user: userId, userType } : undefined,
  });

  order.calculateProductionStart();
  await order.save();

  await order.populate({ path: "client", populate: { path: "store", select: "name" } });
  await order.populate("assignedRep", "name email");

  const orderObj: any = order.toObject();
  orderObj.createdBy = await populateCreatedBy(orderObj.createdBy);

  import("../../jobs/clientOrderJobs").then(({ sendOrderCreatedNotification }) => {
    sendOrderCreatedNotification(order, false);
  });

  res.status(201).json({ message: "Order created successfully", order: orderObj });
});

// PUT/PATCH /api/client-orders/:id
export const updateClientOrder = asyncHandler(async (req, res) => {
  const order = await ClientOrder.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  if (!order.canEdit()) {
    throw new AppError("Order cannot be edited once in production", 400);
  }

  const { deliveryDate, items, discount, discountType, note, shipASAP } = req.body;

  if (deliveryDate) {
    order.deliveryDate = new Date(deliveryDate);
    order.calculateProductionStart();
  }

  if (shipASAP !== undefined) order.shipASAP = shipASAP;

  if (items && Array.isArray(items) && items.length > 0) {
    const processedItems = await Promise.all(
      items.map(async (item: any) => {
        const label = await Label.findById(item.labelId);
        if (!label) throw new AppError(`Label ${item.labelId} not found`, 404);

        if (label.currentStage !== "ready_for_production") {
          throw new AppError(`Label "${label.flavorName}" is not ready for production`, 400);
        }

        const unitPrice = await getUnitPriceByProductType(label.productType);
        if (unitPrice === 0) {
          throw new AppError(
            `Product type "${label.productType}" not found or has no price set`,
            400
          );
        }

        return {
          label: label._id as Types.ObjectId,
          flavorName: label.flavorName,
          productType: label.productType,
          quantity: item.quantity,
          unitPrice,
          lineTotal: Number((item.quantity * unitPrice).toFixed(2)),
        } as IClientOrderItem;
      })
    );

    order.items = processedItems;
    order.subtotal = Number(
      processedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
    );
  }

  if (discount !== undefined) order.discount = discount;
  if (discountType) order.discountType = discountType;

  let discountAmount: number;
  if (order.discountType === "percentage") {
    discountAmount = Number(((order.subtotal * (order.discount || 0)) / 100).toFixed(2));
  } else {
    discountAmount = order.discount || 0;
  }
  order.discountAmount = discountAmount;
  order.total = Number(Math.max(0, order.subtotal - discountAmount).toFixed(2));

  if (note !== undefined) order.note = note;

  await order.save();

  res.json({ message: "Order updated successfully", order });
});

// DELETE /api/client-orders/:id
export const deleteClientOrder = asyncHandler(async (req, res) => {
  const order = await ClientOrder.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  if (order.isInProduction()) {
    throw new AppError("Cannot delete order in production", 400);
  }

  await ClientOrder.findByIdAndDelete(req.params.id);

  res.json({ message: "Order deleted successfully" });
});
