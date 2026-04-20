// src/controllers/deliveryController.ts
import { Delivery } from "../models/Delivery";
import { Rep } from "../models/Rep";
import { Store } from "../models/Store";
import { Order } from "../models/Order";
import Sample from "../models/Sample";
import { ClientOrder } from "../models/ClientOrder";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// 🟩 Create delivery assignment
export const createDelivery = asyncHandler(async (req, res) => {
  const {
    storeId,
    assignedTo,
    disposition,
    paymentAction,
    amount,
    scheduledAt,
    notes,
    orderId,
    sampleId,
    clientOrderId,
  } = req.body;

  const delivery = await Delivery.create({
    storeId,
    assignedTo,
    disposition,
    paymentAction: paymentAction || undefined,
    amount,
    scheduledAt,
    notes,
    orderId,
    sampleId,
    clientOrderId,
    status: "in_transit",
  });

  res.status(201).json({ message: "Delivery created successfully", delivery });
});

// 🟨 Get all deliveries
export const getAllDeliveries = asyncHandler(async (req, res) => {
  const {
    status,
    assignedTo,
    storeId,
    storeName,
    scheduledAt,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = req.query;
  const query: any = {};
  if (status) query.status = status;
  if (assignedTo) query.assignedTo = assignedTo;
  if (storeId) query.storeId = storeId;

  // Date filtering logic
  if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Only snap to day boundaries if the input string looks like a plain date (length 10)
    if ((startDate as string).length === 10) {
      start.setUTCHours(0, 0, 0, 0);
    }
    if ((endDate as string).length === 10) {
      end.setUTCHours(23, 59, 59, 999);
    }

    query.scheduledAt = {
      $gte: start,
      $lte: end,
    };
  } else if (scheduledAt) {
    const startOfDay = new Date(scheduledAt as string);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(scheduledAt as string);
    endOfDay.setUTCHours(23, 59, 59, 999);
    query.scheduledAt = {
      $gte: startOfDay,
      $lt: endOfDay,
    };
  }

  if (storeName) {
    const stores = await Store.find({
      name: { $regex: storeName, $options: "i" },
    }).select("_id");
    const storeIds = stores.map((store) => store._id);
    query.storeId = { $in: storeIds };
  }

  const deliveries = await Delivery.find(query)
    .populate("assignedTo", "name repType")
    .populate("storeId", "name address city state")
    .skip((+page - 1) * +limit)
    .limit(+limit)
    .sort({ createdAt: -1 })
    .lean();

  const total = await Delivery.countDocuments(query);
  res.json({ total, page: +page, limit: +limit, deliveries });
});

// 🟦 Get delivery by ID
export const getDeliveryById = asyncHandler(async (req, res) => {
  const delivery = await Delivery.findById(req.params.id)
    .populate("assignedTo", "name repType")
    .populate("storeId", "name address city state");

  if (!delivery) throw new AppError("Delivery not found", 404);
  res.json(delivery);
});

// 🟨 Update delivery
export const updateDelivery = asyncHandler(async (req, res) => {
  if (req.body.paymentAction === "") {
    req.body.paymentAction = undefined;
  }

  // Explicitly handle orderId and sampleId in updates too if sent
  const delivery = await Delivery.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!delivery) throw new AppError("Delivery not found", 404);
  res.json({ message: "Delivery updated successfully", delivery });
});

// 🟧 Update delivery status
export const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { status, today } = req.body;
  const validStatuses = ["pending", "assigned", "completed", "cancelled"];
  if (!validStatuses.includes(status)) throw new AppError("Invalid status", 400);

  const delivery = await Delivery.findById(req.params.id);
  if (!delivery) throw new AppError("Delivery not found", 404);

  delivery.status = status;
  await delivery.save();

  // Use today's date string sent from the frontend (device local date, YYYY-MM-DD)
  const todayStr =
    today && /^\d{4}-\d{2}-\d{2}$/.test(today) ? today : new Date().toISOString().slice(0, 10);

  // Update linked regular order status when delivery is completed or cancelled
  if (delivery.orderId) {
    if (status === "completed") {
      await Order.findByIdAndUpdate(delivery.orderId, {
        status: "shipped",
        deliveryDate: todayStr,
      });
    } else if (status === "cancelled") {
      await Order.findByIdAndUpdate(delivery.orderId, {
        status: "cancelled",
      });
    }
  }

  // Update linked sample status when delivery is completed or cancelled
  if (delivery.sampleId) {
    if (status === "completed") {
      await Sample.findByIdAndUpdate(delivery.sampleId, {
        status: "shipped",
        deliveryDate: todayStr,
      });
    } else if (status === "cancelled") {
      await Sample.findByIdAndUpdate(delivery.sampleId, {
        status: "cancelled",
      });
    }
  }

  // Update linked client order status when delivery is completed or cancelled
  if (delivery.clientOrderId) {
    if (status === "completed") {
      await ClientOrder.findByIdAndUpdate(delivery.clientOrderId, {
        status: "shipped",
        actualShipDate: new Date(todayStr), // ClientOrder uses Date type for actualShipDate
      });
    } else if (status === "cancelled") {
      await ClientOrder.findByIdAndUpdate(delivery.clientOrderId, {
        status: "cancelled",
      });
    }
  }

  res.json({ message: `Delivery marked as ${status}`, delivery });
});

// 🔍 Check if a delivery exists for a given order/sample/clientOrder
export const checkDeliveryExists = asyncHandler(async (req, res) => {
  const { orderId, sampleId, clientOrderId } = req.query;

  const query: any = {};
  if (orderId) query.orderId = orderId;
  else if (sampleId) query.sampleId = sampleId;
  else if (clientOrderId) query.clientOrderId = clientOrderId;
  else {
    res.status(400).json({ message: "Provide orderId, sampleId, or clientOrderId" });
    return;
  }

  const delivery = await Delivery.findOne(query).select("_id status scheduledAt").lean();
  res.json({ exists: !!delivery, delivery: delivery || null });
});

// 🟥 Delete delivery
export const deleteDelivery = asyncHandler(async (req, res) => {
  const delivery = await Delivery.findByIdAndDelete(req.params.id);
  if (!delivery) throw new AppError("Delivery not found", 404);
  res.json({ message: "Delivery deleted successfully" });
});
