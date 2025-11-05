import { Request, Response } from "express";
import mongoose from "mongoose";
import { Order } from "../models/Order";
import { Rep } from "../models/Rep";
import { Store } from "../models/Store";
import { Product, IProduct } from "../models/Product";

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

export const createOrder = async (req: Request, res: Response) => {
  try {
    const {
      repId,
      storeId,
      items = [],
      note,
      deliveryDate,
      discountType,
      discountValue,
      tax,
    } = req.body;

    // ✅ Validate Rep
    const rep = await Rep.findById(repId);
    if (!rep) return res.status(404).json({ message: "Rep not found" });

    // ✅ Validate Store
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });
    if (store.blocked)
      return res.status(400).json({ message: "Store is blocked" });

    // ✅ Build Order Items (denormalized pricing info)
    // inside createOrder: build orderItems
    const orderItems = await Promise.all(
      (items || []).map(async (item: any) => {
        const product = (await Product.findById(
          item.product
        )) as IProduct | null;
        if (!product) throw new Error(`Product not found: ${item.product}`);

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
    });

    res.status(201).json({
      message: "Order created successfully",
      order,
    });
  } catch (error: any) {
    console.error("Error creating order:", error);
    res.status(500).json({
      message: "Error creating order",
      error: error.message,
    });
  }
};

// ─────────────────────────────
// 🟨 Get All Orders
// ─────────────────────────────

export const getAllOrders = async (req: Request, res: Response) => {
  try {
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

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999); // Set end date to end of day

      matchStage.deliveryDate = {
        $gte: start,
        $lte: end,
      };
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
          createdAt: 1,
          store: { _id: 1, name: 1, address: 1, city: 1, blocked: 1 },
          rep: { _id: 1, name: 1, repType: 1 },
          items: 1,
        },
      }
    );

    const [orders, totalResult] = await Promise.all([
      Order.aggregate(pipeline),
      Order.aggregate(countPipeline),
    ]);

    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    res.json({ total, page: Number(page), limit: Number(limit), orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Error fetching orders", error });
  }
};

// ─────────────────────────────
// 🟦 Get Single Order
// ─────────────────────────────

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("rep", "name repType email")
      .populate("store", "name address city blocked")
      // populate product basic info for the items.product reference
      .populate("items.product", "productLine subProductLine itemName");

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Error fetching order", error });
  }
};

// ─────────────────────────────
// 🟧 Update Order
// ─────────────────────────────

export const updateOrder = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Apply top-level fields (storeId, repId, note, deliveryDate, etc.)
    Object.assign(order, req.body);

    // If items are included in the request, rebuild them properly
    if (req.body.items && Array.isArray(req.body.items)) {
      const updatedItems = await Promise.all(
        req.body.items.map(async (item: any) => {
          const product = await Product.findById(item.product);
          if (!product) throw new Error(`Product not found: ${item.product}`);

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
  } catch (error: any) {
    console.error("Error updating order:", error);
    res.status(500).json({
      message: "Error updating order",
      error: error.message,
    });
  }
};

// ─────────────────────────────
// 🟫 Change Order Status
// ─────────────────────────────

export const changeOrderStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({ message: `Order moved to ${status}`, order });
  } catch (error) {
    console.error("Error changing order status:", error);
    res.status(500).json({ message: "Error changing order status", error });
  }
};

// ─────────────────────────────
// 🟥 Collect Payment
// ─────────────────────────────

export const collectPayment = async (req: Request, res: Response) => {
  try {
    const { method, amount, repId, note } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

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
  } catch (error) {
    console.error("Error collecting payment:", error);
    res.status(500).json({ message: "Error collecting payment", error });
  }
};
