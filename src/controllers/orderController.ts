import mongoose from "mongoose";
import { Order } from "../models/Order";
import { Rep } from "../models/Rep";
import { Store } from "../models/Store";
import { Product, IProduct } from "../models/Product";
import { Admin } from "../models/Admin";
import Sample from "../models/Sample";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

/**
 * Helper: pick price information for a product given a type/label
 * Returns { unitPrice, discountPrice, source, label }.
 *
 * Priority:
 * 1. variant (match by label case-insensitive)
 * 2. product.prices[type] (e.g. prices.hybrid)
 * 3. product.hybridBreakdown[type]
 * 4. product.discountPrice / product.price (product level)
 */
function pickPriceForProduct(product: any, typeOrLabel?: string | null) {
  const norm = typeOrLabel ? String(typeOrLabel).trim().toLowerCase() : null;

  // 1) Variant match (case-insensitive)
  if (product.variants?.length) {
    const found =
      product.variants.find(
        (v: any) => v.label && norm && v.label.trim().toLowerCase() === norm
      ) || null;
    if (found) {
      return {
        unitPrice: Number(found.price ?? 0),
        discountPrice: Number(found.discountPrice ?? 0),
        source: "variant",
        label: found.label,
      };
    }
  }

  // 2) product.prices[type] (e.g. prices.hybrid)
  if (product.prices && norm && product.prices[norm]) {
    const p = product.prices[norm];
    return {
      unitPrice: Number(p.price ?? 0),
      discountPrice: Number(p.discountPrice ?? p.price ?? 0),
      source: `prices.${norm}`,
      label: norm,
    };
  }

  // 3) hybridBreakdown
  if (
    product.hybridBreakdown &&
    norm &&
    product.hybridBreakdown[norm] != null
  ) {
    return {
      unitPrice: Number(product.hybridBreakdown[norm] ?? 0),
      discountPrice: Number(product.discountPrice ?? 0),
      source: "hybridBreakdown",
      label: norm,
    };
  }

  // 4) fallback to product-level
  return {
    unitPrice: Number(product.price ?? 0),
    discountPrice: Number(product.discountPrice ?? product.price ?? 0),
    source: "product-level",
    label: null,
  };
}

// ─────────────────────────────
// 🟩 Create Order
// ─────────────────────────────

export const createOrder = asyncHandler(async (req, res) => {
  const {
    repId,
    storeId,
    items = [],
    note,
    deliveryDate,
    discountType,
    discountValue,
    tax,
    userId,
    userType,
  } = req.body;

  // ✅ Validate Rep
  const rep = await Rep.findById(repId);
  if (!rep) throw new AppError("Rep not found", 404);

  // ✅ Validate Store
  const store = await Store.findById(storeId);
  if (!store) throw new AppError("Store not found", 404);
  if (store.blocked) throw new AppError("Store is blocked", 400);

  // ✅ Build Order Items (denormalized pricing info)
  const orderItems = await Promise.all(
    (items || []).map(async (item: any) => {
      const product = (await Product.findById(item.product)) as IProduct | null;
      if (!product) throw new AppError(`Product not found: ${item.product}`, 404);

      const rawLabel = item.unitLabel ?? null;
      const lookupLabel = rawLabel
        ? String(rawLabel).trim().toLowerCase()
        : null;

      const priceInfo = pickPriceForProduct(product, lookupLabel);

      // NEW: read apply flag from incoming item. default false
      const applyDiscount = !!item.applyDiscount;

      // Decide effective price using the apply flag (not simply presence of discountPrice)
      const effectivePrice =
        applyDiscount &&
        priceInfo.discountPrice &&
        priceInfo.discountPrice > 0
          ? priceInfo.discountPrice
          : priceInfo.unitPrice;

      const qty = Number(item.qty || 0);
      const lineTotal = Number((effectivePrice * qty).toFixed(2));

      return {
        product: product._id,
        name:
          product.itemName || product.subProductLine || product.productLine,
        productLine: product.productLine,
        subProductLine: product.subProductLine,
        sku: product.metadata?.sku || "",
        unitLabel: rawLabel ?? priceInfo.label ?? null,
        unitPrice: Number(priceInfo.unitPrice ?? 0),
        discountPrice: Number(priceInfo.discountPrice ?? 0),
        // NEW: record whether the discount was actually applied for this item
        appliedDiscount: applyDiscount ? true : false,
        qty,
        lineTotal,
      };
    })
  );

  // ✅ Calculate subtotal
  const subtotal = Number(
    orderItems
      .reduce((sum, i) => sum + (Number(i.lineTotal) || 0), 0)
      .toFixed(2)
  );

  // ✅ Discount calculation (same as updateOrder)
  const dType = discountType || "flat"; // "percent" or "flat"
  const dValue = parseFloat(discountValue) || 0;

  let discountAmount = 0;
  if (dType === "percent") {
    discountAmount = (subtotal * dValue) / 100;
  } else {
    discountAmount = dValue;
  }

  discountAmount = Math.max(0, Number(discountAmount.toFixed(2)));

  // ✅ Tax calculation
  const taxAmount = Number(tax || 0);

  // ✅ Total
  const total = Number(
    Math.max(0, subtotal - discountAmount + taxAmount).toFixed(2)
  );

  // ✅ Create the order
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
    ...(userId && userType && {
      createdBy: { user: userId, userType },
    }),
  });

  res.status(201).json({
    message: "Order created successfully",
    order,
  });
});

// ─────────────────────────────
// 🟨 Get All Orders
// ─────────────────────────────

export const getAllOrders = asyncHandler(async (req, res) => {
  const {
    status,
    storeId,
    repId,
    repName,
    page = 1,
    limit = 20,
    search,
    startDate,
    endDate,
  } = req.query;

  const matchStage: any = {};

  if (status && typeof status === "string") {
    matchStage.status = { $in: status.split(",") };
  }
  if (storeId && mongoose.Types.ObjectId.isValid(String(storeId)))
    matchStage.store = new mongoose.Types.ObjectId(String(storeId));
  if (repId && mongoose.Types.ObjectId.isValid(String(repId)))
    matchStage.rep = new mongoose.Types.ObjectId(String(repId));

  // ✅ Filter by date range — use shippedDate if filtering shipped orders, else deliveryDate
  if (startDate && endDate) {
    const startStr = String(startDate);
    const endStr = String(endDate);
    // Also support legacy records where deliveryDate was saved as a full Date object
    const startDate_ = new Date(startStr);
    startDate_.setUTCHours(0, 0, 0, 0);
    const endDate_ = new Date(endStr);
    endDate_.setUTCHours(23, 59, 59, 999);

    const statuses = typeof status === "string" ? status.split(",") : [];
    const isShippedFilter =
      statuses.length > 0 &&
      statuses.every((s) => s === "shipped" || s === "cancelled");

    if (isShippedFilter) {
      // Primary: shippedDate in range (string format)
      // Fallback 1: no shippedDate but deliveryDate string in range
      // Fallback 2: no shippedDate but deliveryDate is a legacy Date object in range
      matchStage.$or = [
        { shippedDate: { $gte: startStr, $lte: endStr } },
        {
          shippedDate: { $exists: false },
          deliveryDate: { $gte: startStr, $lte: endStr },
        },
        {
          shippedDate: { $exists: false },
          deliveryDate: { $gte: startDate_, $lte: endDate_ },
        },
      ];
    } else {
      matchStage.$or = [
        { deliveryDate: { $gte: startStr, $lte: endStr } },
        { deliveryDate: { $gte: startDate_, $lte: endDate_ } },
      ];
    }
  }

  const pipeline: any[] = [
    { $match: matchStage },

    {
      $lookup: {
        from: "stores",
        localField: "store",
        foreignField: "_id",
        as: "store",
      },
    },
    { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "reps",
        localField: "rep",
        foreignField: "_id",
        as: "rep",
      },
    },
    { $unwind: { path: "$rep", preserveNullAndEmptyArrays: true } },

    // Lookup createdBy from admins
    {
      $lookup: {
        from: "admins",
        localField: "createdBy.user",
        foreignField: "_id",
        as: "_createdByAdmin",
      },
    },
    // Lookup createdBy from reps
    {
      $lookup: {
        from: "reps",
        localField: "createdBy.user",
        foreignField: "_id",
        as: "_createdByRep",
      },
    },
    // Merge createdBy with populated user name
    {
      $addFields: {
        createdBy: {
          $cond: {
            if: { $gt: [{ $size: { $ifNull: ["$_createdByAdmin", []] } }, 0] },
            then: {
              user: { $arrayElemAt: ["$_createdByAdmin", 0] },
              userType: "admin",
            },
            else: {
              $cond: {
                if: { $gt: [{ $size: { $ifNull: ["$_createdByRep", []] } }, 0] },
                then: {
                  user: { $arrayElemAt: ["$_createdByRep", 0] },
                  userType: "rep",
                },
                else: null,
              },
            },
          },
        },
      },
    },
  ];

  // Search by store name
  if (search && typeof search === "string" && search.trim()) {
    pipeline.push({
      $match: {
        "store.name": { $regex: search.trim(), $options: "i" },
      },
    });
  }

  // Filter by rep name
  if (repName && typeof repName === "string" && repName.trim()) {
    pipeline.push({
      $match: {
        "rep.name": { $regex: repName.trim(), $options: "i" },
      },
    });
  }

  // Create a separate pipeline for counting documents
  const countPipeline = [...pipeline, { $count: "total" }];

  pipeline.push(
    { $sort: { createdAt: -1 } },
    { $skip: (Number(page) - 1) * Number(limit) },
    { $limit: Number(limit) },
    {
      $project: {
        orderNumber: 1,
        status: 1,
        total: 1,
        subtotal: 1,
        discount: 1,
        note: 1,
        deliveryDate: 1,
        shippedDate: 1,
        // discountType: 1,
        createdAt: 1,
        store: { _id: 1, name: 1, address: 1, city: 1, blocked: 1 },
        rep: { _id: 1, name: 1, repType: 1 },
        items: 1,
        createdBy: {
          user: { _id: 1, name: 1 },
          userType: 1,
        },
      },
    }
  );

  const [orders, totalResult] = await Promise.all([
    Order.aggregate(pipeline),
    Order.aggregate(countPipeline),
  ]);

  const orderTotal = totalResult.length > 0 ? totalResult[0].total : 0;

  // ✅ Fetch samples with the same filters
  const sampleMatchStage: any = {};

  if (status && typeof status === "string") {
    sampleMatchStage.status = { $in: status.split(",") };
  }
  if (storeId && mongoose.Types.ObjectId.isValid(String(storeId)))
    sampleMatchStage.store = new mongoose.Types.ObjectId(String(storeId));
  if (repId && mongoose.Types.ObjectId.isValid(String(repId)))
    sampleMatchStage.rep = new mongoose.Types.ObjectId(String(repId));

  if (startDate && endDate) {
    const startStr = String(startDate);
    const endStr = String(endDate);
    const statuses_ = typeof status === "string" ? status.split(",") : [];
    const isShippedFilter_ =
      statuses_.length > 0 &&
      statuses_.every((s) => s === "shipped" || s === "cancelled");

    if (isShippedFilter_) {
      sampleMatchStage.$or = [
        { shippedDate: { $gte: startStr, $lte: endStr } },
        {
          shippedDate: { $exists: false },
          deliveryDate: { $gte: startStr, $lte: endStr },
        },
      ];
    } else {
      sampleMatchStage.deliveryDate = { $gte: startStr, $lte: endStr };
    }
  }

  const samplePipeline: any[] = [
    { $match: sampleMatchStage },
    {
      $lookup: {
        from: "stores",
        localField: "store",
        foreignField: "_id",
        as: "store",
      },
    },
    { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "reps",
        localField: "rep",
        foreignField: "_id",
        as: "rep",
      },
    },
    { $unwind: { path: "$rep", preserveNullAndEmptyArrays: true } },

    // Lookup createdBy from admins
    {
      $lookup: {
        from: "admins",
        localField: "createdBy.user",
        foreignField: "_id",
        as: "_createdByAdmin",
      },
    },
    // Lookup createdBy from reps
    {
      $lookup: {
        from: "reps",
        localField: "createdBy.user",
        foreignField: "_id",
        as: "_createdByRep",
      },
    },
    // Merge createdBy with populated user name
    {
      $addFields: {
        createdBy: {
          $cond: {
            if: { $gt: [{ $size: { $ifNull: ["$_createdByAdmin", []] } }, 0] },
            then: {
              user: { $arrayElemAt: ["$_createdByAdmin", 0] },
              userType: "admin",
            },
            else: {
              $cond: {
                if: { $gt: [{ $size: { $ifNull: ["$_createdByRep", []] } }, 0] },
                then: {
                  user: { $arrayElemAt: ["$_createdByRep", 0] },
                  userType: "rep",
                },
                else: null,
              },
            },
          },
        },
      },
    },
  ];

  // Search by store name for samples
  if (search && typeof search === "string" && search.trim()) {
    samplePipeline.push({
      $match: {
        "store.name": { $regex: search.trim(), $options: "i" },
      },
    });
  }

  // Filter by rep name for samples
  if (repName && typeof repName === "string" && repName.trim()) {
    samplePipeline.push({
      $match: {
        "rep.name": { $regex: repName.trim(), $options: "i" },
      },
    });
  }

  const sampleCountPipeline = [...samplePipeline, { $count: "total" }];

  samplePipeline.push(
    { $sort: { createdAt: -1 } },
    { $skip: (Number(page) - 1) * Number(limit) },
    { $limit: Number(limit) },
    {
      $project: {
        status: 1,
        samples: 1,
        description: 1,
        notes: 1,
        deliveryDate: 1,
        shippedDate: 1,
        createdAt: 1,
        store: { _id: 1, name: 1, address: 1, city: 1, blocked: 1 },
        rep: { _id: 1, name: 1, repType: 1 },
        createdBy: {
          user: { _id: 1, name: 1 },
          userType: 1,
        },
        isSample: { $literal: true },
      },
    }
  );

  const [samples, sampleTotalResult] = await Promise.all([
    Sample.aggregate(samplePipeline),
    Sample.aggregate(sampleCountPipeline),
  ]);

  const sampleTotal = sampleTotalResult.length > 0 ? sampleTotalResult[0].total : 0;

  // ✅ Combine orders and samples, sort by createdAt
  const combined = [...orders, ...samples].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const total = orderTotal + sampleTotal;

  res.json({ total, page: Number(page), limit: Number(limit), orders: combined });
});

// ─────────────────────────────
// 🟦 Get Single Order
// ─────────────────────────────

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("rep", "name repType email")
    .populate("store", "name address city blocked")
    // populate product basic info for the items.product reference
    .populate("items.product", "productLine subProductLine itemName");

  if (!order) throw new AppError("Order not found", 404);

  // Manually populate createdBy.user from the correct collection
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
// 🟧 Update Order
// ─────────────────────────────

export const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError("Order not found", 404);

  // Normalize date fields to YYYY-MM-DD — if already correct format keep as-is,
  // otherwise parse using PST (app timezone) to avoid UTC day-shift
  const toDateStr = (val: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    return new Date(val).toLocaleDateString("en-CA", {
      timeZone: "America/Los_Angeles",
    });
  };
  if (req.body.deliveryDate) req.body.deliveryDate = toDateStr(req.body.deliveryDate);
  else if ("deliveryDate" in req.body) req.body.deliveryDate = null;
  if (req.body.shippedDate) req.body.shippedDate = toDateStr(req.body.shippedDate);
  else if ("shippedDate" in req.body) req.body.shippedDate = null;

  // Apply top-level fields (storeId, repId, note, deliveryDate, etc.)
  Object.assign(order, req.body);

  // If items are included in the request, rebuild them properly
  if (req.body.items && Array.isArray(req.body.items)) {
    const updatedItems = await Promise.all(
      req.body.items.map(async (item: any) => {
        const product = await Product.findById(item.product);
        if (!product) throw new AppError(`Product not found: ${item.product}`, 404);

        const rawLabel = item.unitLabel ?? null;
        const lookupLabel = rawLabel
          ? String(rawLabel).trim().toLowerCase()
          : null;

        // inside updateOrder when building updatedItems:
        const priceInfo = pickPriceForProduct(product, lookupLabel);
        const applyDiscount = !!item.applyDiscount;

        const effectivePrice =
          applyDiscount &&
          priceInfo.discountPrice &&
          priceInfo.discountPrice > 0
            ? priceInfo.discountPrice
            : priceInfo.unitPrice;

        const qty = Number(item.qty || 0);
        const lineTotal = Number((effectivePrice * qty).toFixed(2));

        return {
          product: product._id,
          name:
            product.itemName || product.subProductLine || product.productLine,
          productLine: product.productLine,
          subProductLine: product.subProductLine,
          sku: product.metadata?.sku || "",
          unitLabel: rawLabel ?? priceInfo.label ?? null,
          unitPrice: Number(priceInfo.unitPrice ?? 0),
          discountPrice: Number(priceInfo.discountPrice ?? 0),
          appliedDiscount: applyDiscount ? true : false, // <- persisted
          qty,
          lineTotal,
        };
      })
    );

    // Recalculate subtotal
    order.items = updatedItems;
    order.subtotal = Number(
      updatedItems
        .reduce((sum: number, i: any) => sum + (Number(i.lineTotal) || 0), 0)
        .toFixed(2)
    );

    // --- ✅ Discount logic update ---
    const discountType = req.body.discountType || "flat"; // "percent" or "flat"
    const discountValue = parseFloat(req.body.discountValue) || 0; // numeric value

    let discountAmount = 0;

    if (discountType === "percent") {
      discountAmount = (order.subtotal * discountValue) / 100;
    } else {
      discountAmount = discountValue;
    }

    discountAmount = Math.max(0, Number(discountAmount.toFixed(2)));
    order.discount = discountAmount;

    // Tax (if any)
    const taxAmount = Number(req.body.tax || 0);
    order.tax = taxAmount;

    // --- ✅ Final total ---
    order.total = Number(
      Math.max(0, order.subtotal - discountAmount + taxAmount).toFixed(2)
    );
  }

  await order.save();

  res.json({
    message: "Order updated successfully",
    order,
  });
});

// ─────────────────────────────
// 🟫 Change Order Status
// ─────────────────────────────

export const changeOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new AppError("Status is required", 400);

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  if (!order) throw new AppError("Order not found", 404);

  res.json({ message: `Order moved to ${status}`, order });
});

// ─────────────────────────────
// 🟥 Collect Payment
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
