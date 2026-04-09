import { Order } from "../../models/Order";
import { Rep } from "../../models/Rep";
import { Store } from "../../models/Store";
import { Product } from "../../models/Product";
import { Admin } from "../../models/Admin";
import Sample from "../../models/Sample";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { buildOrderItem, calcDiscount } from "./orderHelpers";
import {
  buildMatchStage,
  createdByLookupStages,
  storeRepLookupStages,
  productLookupStages,
} from "./orderPipeline";

// ─────────────────────────────
// Create Order
// ─────────────────────────────

export const createOrder = asyncHandler(async (req, res) => {
  const { repId, storeId, items = [], note, deliveryDate, discountType, discountValue, tax, userId, userType } = req.body;

  const rep = await Rep.findById(repId);
  if (!rep) throw new AppError("Rep not found", 404);

  const store = await Store.findById(storeId);
  if (!store) throw new AppError("Store not found", 404);
  if (store.blocked) throw new AppError("Store is blocked", 400);

  const orderItems = await Promise.all(
    (items || []).map(async (item: any) => {
      const product = await Product.findById(item.product);
      if (!product) throw new AppError(`Product not found: ${item.product}`, 404);
      return buildOrderItem(product, item);
    })
  );

  const subtotal = Number(orderItems.reduce((sum, i) => sum + (Number(i.lineTotal) || 0), 0).toFixed(2));
  const dType = discountType || "flat";
  const dValue = parseFloat(discountValue) || 0;
  const discountAmount = calcDiscount(subtotal, dType, dValue);
  const taxAmount = Number(tax || 0);
  const total = Number(Math.max(0, subtotal - discountAmount + taxAmount).toFixed(2));

  const order = await Order.create({
    store: store._id,
    rep: rep._id,
    items: orderItems,
    subtotal,
    tax: taxAmount,
    discount: discountAmount,
    discountType: dType,
    discountValue: dValue,
    total,
    note,
    deliveryDate,
    status: "submitted",
    ...(userId && userType && { createdBy: { user: userId, userType } }),
  });

  res.status(201).json({ message: "Order created successfully", order });
});

// ─────────────────────────────
// Get All Orders
// ─────────────────────────────

export const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, repName } = req.query;

  const matchStage = buildMatchStage(req.query);

  const pipeline: any[] = [
    { $match: matchStage },
    ...productLookupStages,
    ...storeRepLookupStages,
    ...createdByLookupStages,
  ];

  if (search && typeof search === "string" && search.trim()) {
    pipeline.push({ $match: { "store.name": { $regex: search.trim(), $options: "i" } } });
  }
  if (repName && typeof repName === "string" && repName.trim()) {
    pipeline.push({ $match: { "rep.name": { $regex: repName.trim(), $options: "i" } } });
  }

  const countPipeline = [...pipeline, { $count: "total" }];

  pipeline.push(
    { $sort: { createdAt: -1 } },
    { $skip: (Number(page) - 1) * Number(limit) },
    { $limit: Number(limit) },
    {
      $project: {
        orderNumber: 1, status: 1, total: 1, subtotal: 1, discount: 1,
        note: 1, deliveryDate: 1, shippedDate: 1, createdAt: 1,
        store: { _id: 1, name: 1, address: 1, city: 1, blocked: 1 },
        rep: { _id: 1, name: 1, repType: 1 },
        items: 1,
        createdBy: { user: { _id: 1, name: 1 }, userType: 1 },
      },
    }
  );

  const [orders, totalResult] = await Promise.all([
    Order.aggregate(pipeline),
    Order.aggregate(countPipeline),
  ]);

  const orderTotal = totalResult.length > 0 ? totalResult[0].total : 0;

  // Samples pipeline
  const sampleMatchStage = buildMatchStage(req.query);

  const samplePipeline: any[] = [
    { $match: sampleMatchStage },
    ...storeRepLookupStages,
    ...createdByLookupStages,
  ];

  if (search && typeof search === "string" && search.trim()) {
    samplePipeline.push({ $match: { "store.name": { $regex: search.trim(), $options: "i" } } });
  }
  if (repName && typeof repName === "string" && repName.trim()) {
    samplePipeline.push({ $match: { "rep.name": { $regex: repName.trim(), $options: "i" } } });
  }

  const sampleCountPipeline = [...samplePipeline, { $count: "total" }];

  samplePipeline.push(
    { $sort: { createdAt: -1 } },
    { $skip: (Number(page) - 1) * Number(limit) },
    { $limit: Number(limit) },
    {
      $project: {
        status: 1, samples: 1, description: 1, notes: 1,
        deliveryDate: 1, shippedDate: 1, createdAt: 1,
        store: { _id: 1, name: 1, address: 1, city: 1, blocked: 1 },
        rep: { _id: 1, name: 1, repType: 1 },
        createdBy: { user: { _id: 1, name: 1 }, userType: 1 },
        isSample: { $literal: true },
      },
    }
  );

  const [samples, sampleTotalResult] = await Promise.all([
    Sample.aggregate(samplePipeline),
    Sample.aggregate(sampleCountPipeline),
  ]);

  const sampleTotal = sampleTotalResult.length > 0 ? sampleTotalResult[0].total : 0;

  const combined = [...orders, ...samples].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  res.json({ total: orderTotal + sampleTotal, page: Number(page), limit: Number(limit), orders: combined });
});

// ─────────────────────────────
// Get Single Order
// ─────────────────────────────

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("rep", "name repType email")
    .populate("store", "name address city blocked")
    .populate("items.product", "productLine subProductLine itemName");

  if (!order) throw new AppError("Order not found", 404);

  if (order.createdBy?.user && order.createdBy?.userType) {
    const creator =
      order.createdBy.userType === "admin"
        ? await Admin.findById(order.createdBy.user).select("name").lean()
        : await Rep.findById(order.createdBy.user).select("name").lean();
    if (creator) {
      (order as any).createdBy = {
        user: { _id: creator._id, name: creator.name },
        userType: order.createdBy.userType,
      };
    }
  }

  res.json(order);
});

// ─────────────────────────────
// Update Order
// ─────────────────────────────

export const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  const toDateStr = (val: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    return new Date(val).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  };

  if (req.body.deliveryDate) req.body.deliveryDate = toDateStr(req.body.deliveryDate);
  else if ("deliveryDate" in req.body) req.body.deliveryDate = null;
  if (req.body.shippedDate) req.body.shippedDate = toDateStr(req.body.shippedDate);
  else if ("shippedDate" in req.body) req.body.shippedDate = null;

  Object.assign(order, req.body);

  if (req.body.items && Array.isArray(req.body.items)) {
    const updatedItems = await Promise.all(
      req.body.items.map(async (item: any) => {
        const product = await Product.findById(item.product);
        if (!product) throw new AppError(`Product not found: ${item.product}`, 404);
        return buildOrderItem(product, item);
      })
    );

    order.items = updatedItems;
    order.subtotal = Number(
      updatedItems.reduce((sum: number, i: any) => sum + (Number(i.lineTotal) || 0), 0).toFixed(2)
    );

    const discountType = req.body.discountType || "flat";
    const discountValue = parseFloat(req.body.discountValue) || 0;
    order.discount = calcDiscount(order.subtotal, discountType, discountValue);
    order.tax = Number(req.body.tax || 0);
    order.total = Number(Math.max(0, order.subtotal - order.discount + order.tax).toFixed(2));
  }

  await order.save();
  res.json({ message: "Order updated successfully", order });
});

// ─────────────────────────────
// Change Order Status
// ─────────────────────────────

export const changeOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new AppError("Status is required", 400);

  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!order) throw new AppError("Order not found", 404);

  res.json({ message: `Order moved to ${status}`, order });
});

// ─────────────────────────────
// Collect Payment
// ─────────────────────────────

export const collectPayment = asyncHandler(async (req, res) => {
  const { method, amount, repId, note } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  order.payment = {
    method,
    amount,
    collected: true,
    collectedBy: repId,
    collectedAt: new Date(),
    note,
  };

  await order.save();
  res.json({ message: "Payment collected successfully", order });
});
