// src/controllers/clientOrderController.ts
import mongoose, { Types } from "mongoose";
import { ClientOrder, IClientOrderItem } from "../models/ClientOrder";
import { PrivateLabelClient } from "../models/PrivateLabelClient";
import { Label } from "../models/Label";
import { PrivateLabelProduct } from "../models/PrivateLabelProduct";
import { Admin } from "../models/Admin";
import { CookItem } from "../models/CookItem";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// Helper to get unit price by product type from database
async function getUnitPriceByProductType(productType: string): Promise<number> {
  const product = await PrivateLabelProduct.findOne({
    name: productType,
    isActive: true,
  });
  return product?.unitPrice || 0;
}

// GET ALL CLIENT ORDERS
export const getAllClientOrders = asyncHandler(async (req, res) => {
  const {
    clientId,
    status,
    repId,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 20,
  } = req.query;

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

  // Search by order number or store name
  if (search && typeof search === "string" && search.trim()) {
    const searchRegex = { $regex: search.trim(), $options: "i" };

    if (search.toUpperCase().startsWith("PL")) {
      filter.orderNumber = searchRegex;
    } else {
      const clients = await PrivateLabelClient.find().populate("store");
      const matchingClientIds = clients
        .filter((c: any) =>
          c.store?.name?.toLowerCase().includes(search.toLowerCase())
        )
        .map((c) => c._id);
      filter.client = { $in: matchingClientIds };
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [rawOrders, total] = await Promise.all([
    ClientOrder.find(filter)
      .populate({
        path: "client",
        populate: {
          path: "store",
          select: "name address city state storeId",
        },
      })
      .populate("assignedRep", "name email")
      .populate("items.label", "flavorName productType cannabinoidMix color flavorComponents colorComponents labelImages itemId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ClientOrder.countDocuments(filter),
  ]);

  // Populate createdBy user name
  const { Rep } = await import("../models/Rep");
  const orders = await Promise.all(
    rawOrders.map(async (order: any) => {
      if (order.createdBy?.user) {
        const creator = order.createdBy.userType === "admin"
          ? await Admin.findById(order.createdBy.user).select("name").lean()
          : await Rep.findById(order.createdBy.user).select("name").lean();
        order.createdBy = {
          user: { _id: order.createdBy.user, name: creator?.name || "Unknown" },
          userType: order.createdBy.userType,
        };
      }
      return order;
    })
  );

  res.json({
    total,
    orders,
    page: Number(page),
    limit: Number(limit),
  });
});

// GET CLIENT ORDER BY ID
export const getClientOrderById = asyncHandler(async (req, res) => {
  const order: any = await ClientOrder.findById(req.params.id)
    .populate({
      path: "client",
      populate: {
        path: "store",
        select: "name address city state zip storeId",
      },
    })
    .populate("assignedRep", "name email")
    .populate("items.label", "flavorName productType cannabinoidMix color flavorComponents colorComponents labelImages itemId")
    .lean();

  if (!order) throw new AppError("Order not found", 404);

  // Populate createdBy user name
  if (order.createdBy?.user) {
    const { Rep } = await import("../models/Rep");
    const creator = order.createdBy.userType === "admin"
      ? await Admin.findById(order.createdBy.user).select("name").lean()
      : await Rep.findById(order.createdBy.user).select("name").lean();
    order.createdBy = {
      user: { _id: order.createdBy.user, name: creator?.name || "Unknown" },
      userType: order.createdBy.userType,
    };
  }

  res.json(order);
});

// CREATE CLIENT ORDER
// NOTE: shipASAP can be set at order creation (checkbox option)
export const createClientOrder = asyncHandler(async (req, res) => {
  const {
    clientId,
    deliveryDate,
    items,
    discount = 0,
    discountType = "flat",
    note,
    shipASAP = false, // Can be set at order creation
    userId,
    userType,
  } = req.body;

  // Validate client
  const client = await PrivateLabelClient.findById(clientId);
  if (!client) throw new AppError("Client not found", 404);

  // Validate items
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError("At least one item is required", 400);
  }

  // Process items - get unit price from product type (FIXED pricing)
  const processedItems = await Promise.all(
    items.map(async (item: any) => {
      const label = await Label.findById(item.labelId);

      if (!label) {
        throw new AppError(`Label ${item.labelId} not found`, 404);
      }

      if (label.currentStage !== "ready_for_production") {
        throw new AppError(
          `Label "${label.flavorName}" is not ready for production`,
          400
        );
      }

      if (label.client.toString() !== clientId.toString()) {
        throw new AppError(`Label does not belong to this client`, 400);
      }

      if (!item.quantity || item.quantity <= 0) {
        throw new AppError("Quantity must be greater than 0", 400);
      }

      // Get unit price from product type (from database)
      const unitPrice = await getUnitPriceByProductType(label.productType);
      if (unitPrice === 0) {
        throw new AppError(
          `Product type "${label.productType}" not found or has no price set`,
          400
        );
      }
      const lineTotal = Number((item.quantity * unitPrice).toFixed(2));

      return {
        label: label._id as Types.ObjectId,
        flavorName: label.flavorName,
        productType: label.productType,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      } as IClientOrderItem;
    })
  );

  // Calculate totals
  const subtotal = Number(
    processedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
  );

  // Calculate discount
  let discountAmount = 0;
  if (discountType === "percentage") {
    if (discount < 0 || discount > 100) {
      throw new AppError("Percentage discount must be between 0 and 100", 400);
    }
    discountAmount = Number(((subtotal * discount) / 100).toFixed(2));
  } else {
    if (discount < 0) {
      throw new AppError("Discount cannot be negative", 400);
    }
    discountAmount = Number(discount);
  }

  const total = Number(Math.max(0, subtotal - discountAmount).toFixed(2));

  // Create order - shipASAP can be set at creation
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
    shipASAP, // Set at order creation time
    createdBy: userId ? { user: userId, userType } : undefined,
  });

  order.calculateProductionStart();
  await order.save();

  await order.populate({
    path: "client",
    populate: { path: "store", select: "name" },
  });
  await order.populate("assignedRep", "name email");

  // Populate createdBy user name before returning
  const orderObj: any = order.toObject();
  if (orderObj.createdBy?.user) {
    const { Rep } = await import("../models/Rep");
    const creator = orderObj.createdBy.userType === "admin"
      ? await Admin.findById(orderObj.createdBy.user).select("name").lean()
      : await Rep.findById(orderObj.createdBy.user).select("name").lean();
    orderObj.createdBy = {
      user: { _id: orderObj.createdBy.user, name: creator?.name || "Unknown" },
      userType: orderObj.createdBy.userType,
    };
  }

  // Send order created email to client (async, don't block response)
  import("../jobs/clientOrderJobs").then(({ sendOrderCreatedNotification }) => {
    sendOrderCreatedNotification(order, false);
  });

  res.status(201).json({
    message: "Order created successfully",
    order: orderObj,
  });
});

// UPDATE CLIENT ORDER
export const updateClientOrder = asyncHandler(async (req, res) => {
  const order = await ClientOrder.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  if (!order.canEdit()) {
    throw new AppError("Order cannot be edited once in production", 400);
  }

  const { deliveryDate, items, discount, discountType, note, shipASAP } =
    req.body;

  // Update delivery date
  if (deliveryDate) {
    order.deliveryDate = new Date(deliveryDate);
    order.calculateProductionStart();
  }

  // Update shipASAP
  if (shipASAP !== undefined) {
    order.shipASAP = shipASAP;
  }

  // Update items if provided
  if (items && Array.isArray(items) && items.length > 0) {
    const processedItems = await Promise.all(
      items.map(async (item: any) => {
        const label = await Label.findById(item.labelId);

        if (!label) {
          throw new AppError(`Label ${item.labelId} not found`, 404);
        }

        if (label.currentStage !== "ready_for_production") {
          throw new AppError(
            `Label "${label.flavorName}" is not ready for production`,
            400
          );
        }

        // Get unit price from product type (from database)
        const unitPrice = await getUnitPriceByProductType(label.productType);
        if (unitPrice === 0) {
          throw new AppError(
            `Product type "${label.productType}" not found or has no price set`,
            400
          );
        }
        const lineTotal = Number((item.quantity * unitPrice).toFixed(2));

        return {
          label: label._id as Types.ObjectId,
          flavorName: label.flavorName,
          productType: label.productType,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
        } as IClientOrderItem;
      })
    );

    order.items = processedItems;
    order.subtotal = Number(
      processedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2)
    );
  }

  // Update discount
  if (discount !== undefined) {
    order.discount = discount;
  }
  if (discountType) {
    order.discountType = discountType;
  }

  // Recalculate discount amount and total
  let discountAmount = 0;
  if (order.discountType === "percentage") {
    discountAmount = Number(
      ((order.subtotal * (order.discount || 0)) / 100).toFixed(2)
    );
  } else {
    discountAmount = order.discount || 0;
  }
  order.discountAmount = discountAmount;
  order.total = Number(
    Math.max(0, order.subtotal - discountAmount).toFixed(2)
  );

  if (note !== undefined) {
    order.note = note;
  }

  await order.save();

  res.json({
    message: "Order updated successfully",
    order,
  });
});

// UPDATE ORDER STATUS
export const updateClientOrderStatus = asyncHandler(async (req, res) => {
  const order = await ClientOrder.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  const { status, trackingNumber } = req.body;

  const validStatuses = [
    "waiting",
    "cooking_molding",
    "dehydrating",
    "demolding",
    "packaging_casing",
    "ready_to_ship",
    "shipped",
  ];

  if (!validStatuses.includes(status)) {
    throw new AppError("Invalid status", 400);
  }

  const previousStatus = order.status;

  // Block reverting to waiting once production has started (Stage 1 or beyond)
  const productionStatuses = ["cooking_molding", "dehydrating", "demolding", "packaging_casing", "ready_to_ship"];
  if (status === "waiting" && productionStatuses.includes(previousStatus)) {
    throw new AppError("Cannot revert order to waiting once production has started", 400);
  }

  // If reverting to waiting, delete all associated CookItems so PPS is reset
  if (status === "waiting" && previousStatus !== "waiting") {
    await CookItem.deleteMany({ privateLabOrderId: order._id });
  }

  order.status = status;

  // Handle cooking_molding (production started) - send notification email
  if (status === "cooking_molding" && previousStatus !== "cooking_molding") {
    await order.save();
    // Send production started notification (async, don't block response)
    import("../jobs/clientOrderJobs").then(({ sendProductionStartedNotification }) => {
      sendProductionStartedNotification(order);
    });
  }

  // Handle ready_to_ship - send notification email
  if (status === "ready_to_ship" && previousStatus !== "ready_to_ship") {
    await order.save();
    // Send ready-to-ship notification (async, don't block response)
    import("../jobs/clientOrderJobs").then(({ sendReadyToShipNotification }) => {
      sendReadyToShipNotification(order);
    });
  }

  // Handle shipped status
  if (status === "shipped") {
    order.actualShipDate = new Date();
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }
    await order.save();
    // Send shipped notification then create recurring order (sequential to avoid Resend rate limits)
    import("../jobs/clientOrderJobs").then(async ({ sendShippedNotification, createRecurringOrder }) => {
      await sendShippedNotification(order);
      await createRecurringOrder(order);
    });
  } else {
    await order.save();
  }

  res.json({
    message: `Order status updated to ${status}`,
    order,
  });
});

// PUSH ORDER TO PPS (Production Planning System)
export const pushOrderToPPS = asyncHandler(async (req, res) => {
  const order = await ClientOrder.findById(req.params.id)
    .populate({ path: "items.label", select: "flavorName productType flavorComponents colorComponents itemId" })
    .populate({ path: "client", populate: { path: "store", select: "name storeId _id" } });

  if (!order) throw new AppError("Order not found", 404);

  if (order.status !== "waiting") {
    throw new AppError("Order is not in waiting status", 400);
  }

  const storeMongoId = (order.client as any)?.store?._id;
  const storeId = (order.client as any)?.store?.storeId;
  const storeName = (order.client as any)?.store?.name;

  if (!storeMongoId || !storeId || !storeName) {
    throw new AppError("Order client/store data is missing", 400);
  }

  // Normalise orderNumber: remove dash (PL-10154 → PL10154)
  const normalizedOrderNumber = (order.orderNumber as string).replace("-", "");

  // Build cook item documents — one per order item
  const cookItemDocs = order.items.map((item: any) => {
    const label = item.label as any;
    const labelId = String(label._id);
    if (!label.itemId) throw new AppError(`Label itemId missing for label ${labelId} — run backfillLabelItemIds script`, 400);
    return {
      cookItemId: `${storeId}${normalizedOrderNumber}${label.itemId}`,
      customerId: storeMongoId,
      orderId: order.orderNumber,
      itemId: labelId,
      labelId: label._id,
      privateLabOrderId: order._id,
      storeName,
      flavor: label.flavorName,
      quantity: item.quantity,
      flavorComponents: label.flavorComponents || [],
      colorComponents: label.colorComponents || [],
      productType: label.productType,
      specialFormulation: false,
      status: "pending",
      expectedCount: item.quantity,
    };
  });

  await CookItem.insertMany(cookItemDocs);

  order.status = "cooking_molding";
  await order.save();

  // Send production started email to client (async, don't block response)
  import("../jobs/clientOrderJobs").then(({ sendProductionStartedNotification }) => {
    sendProductionStartedNotification(order);
  });

  res.json({
    message: "Order pushed to production",
    cookItemsCreated: cookItemDocs.length,
    order,
  });
});

// UPDATE DELIVERY DATE
export const updateDeliveryDate = asyncHandler(async (req, res) => {
  const order = await ClientOrder.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  const { deliveryDate } = req.body;
  if (!deliveryDate) throw new AppError("Delivery date is required", 400);

  order.deliveryDate = new Date(deliveryDate);

  // Recalculate production start if still waiting
  if (order.status === "waiting") {
    order.calculateProductionStart();
  }

  await order.save();

  res.json({
    message: "Delivery date updated successfully",
    order,
  });
});

// TOGGLE SHIP ASAP
export const toggleShipASAP = asyncHandler(async (req, res) => {
  const order = await ClientOrder.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  const { shipASAP } = req.body;

  order.shipASAP = shipASAP !== undefined ? shipASAP : !order.shipASAP;
  await order.save();

  res.json({
    message: order.shipASAP
      ? "Order marked for immediate shipping"
      : "Ship ASAP disabled",
    order,
  });
});

// DELETE CLIENT ORDER
export const deleteClientOrder = asyncHandler(async (req, res) => {
  const order = await ClientOrder.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  if (order.isInProduction()) {
    throw new AppError("Cannot delete order in production", 400);
  }

  await ClientOrder.findByIdAndDelete(req.params.id);

  res.json({ message: "Order deleted successfully" });
});


// COMPLETE PRODUCTION CALLBACK
// Fallback API endpoint — PPS calls completeProduction() internally,
// but this allows external/future service separation.
export const completeProductionCallback = asyncHandler(async (req, res) => {
  const order = await ClientOrder.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  order.status = "ready_to_ship";
  await order.save();

  import("../jobs/clientOrderJobs").then(({ sendReadyToShipNotification }) => {
    sendReadyToShipNotification(order);
  });

  res.json({ success: true, order });
});
