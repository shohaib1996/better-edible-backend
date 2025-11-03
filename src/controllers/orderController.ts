import { Request, Response } from "express";
import mongoose from "mongoose";
import { Order } from "../models/Order";
import { Rep } from "../models/Rep";
import { Store } from "../models/Store";
import { Product, IProduct } from "../models/Product";

// ─────────────────────────────
// 🟩 Create Order
// ─────────────────────────────

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { repId, storeId, items, note, deliveryDate } = req.body;

    // Validate Rep
    const rep = await Rep.findById(repId);
    if (!rep) return res.status(404).json({ message: "Rep not found" });

    // Validate Store
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });
    if (store.blocked)
      return res.status(400).json({ message: "Store is blocked" });

    // 🧩 Build Order Items (denormalize product pricing)
    const orderItems = await Promise.all(
      items.map(async (item: any) => {
        const product = (await Product.findById(
          item.product
        )) as IProduct | null;
        if (!product) throw new Error(`Product not found: ${item.product}`);

        // 🔸 Pick price from variants or base price
        const variant =
          product.variants?.find((v) => v.label === item.unitLabel) ||
          product.variants?.[0];

        const price =
          variant?.discountPrice ??
          variant?.price ??
          product.discountPrice ??
          product.price ??
          0;

        const lineTotal = price * item.qty;

        return {
          product: product._id,
          name:
            product.itemName || product.subProductLine || product.productLine,
          items,
          productLine: product.productLine,
          subProductLine: product.subProductLine,
          sku: product.metadata?.sku || "",
          unitLabel: variant?.label || null,
          unitPrice: variant?.price ?? product.price ?? 0,
          discountPrice: variant?.discountPrice ?? product.discountPrice ?? 0,
          qty: item.qty,
          lineTotal,
        };
      })
    );

    const subtotal = orderItems.reduce((sum, i) => sum + i.lineTotal, 0);

    // 🧾 Create Order
    const order = await Order.create({
      store: store._id,
      rep: rep._id,
      items: orderItems,
      subtotal,
      total: subtotal,
      note,
      deliveryDate,
      status: "draft",
    });

    res.status(201).json(order);
  } catch (error: any) {
    console.error(error);
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
    } = req.query;

    const matchStage: any = {};

    if (status) matchStage.status = status;
    if (storeId && mongoose.Types.ObjectId.isValid(storeId.toString()))
      matchStage.store = new mongoose.Types.ObjectId(storeId.toString());
    if (repId && mongoose.Types.ObjectId.isValid(repId.toString()))
      matchStage.rep = new mongoose.Types.ObjectId(repId.toString());

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

    // ✅ Search by store name
    if (search && typeof search === "string" && search.trim()) {
      pipeline.push({
        $match: {
          "store.name": { $regex: search.trim(), $options: "i" },
        },
      });
    }

    // ✅ Filter by rep name
    if (repName && typeof repName === "string" && repName.trim()) {
      pipeline.push({
        $match: {
          "rep.name": { $regex: repName.trim(), $options: "i" },
        },
      });
    }

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
          discount: 1, // ✅ already included
          note: 1,
          deliveryDate: 1,
          createdAt: 1,
          store: { _id: 1, name: 1, address: 1, city: 1, blocked: 1 },
          rep: { _id: 1, name: 1, repType: 1 },
          items: 1, // ✅ now included
        },
      }
    );

    const orders = await Order.aggregate(pipeline);
    const total = await Order.countDocuments(matchStage);

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
      .populate("items.product", "productLine subProductLine itemName");

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Error fetching order", error });
  }
};

// ─────────────────────────────
// 🟧 Update Order (Draft only)
// ─────────────────────────────

export const updateOrder = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // ❌ Removed the restriction — all orders are now editable
    // if (order.status !== "draft")
    //   return res
    //     .status(400)
    //     .json({ message: "Cannot edit a non-draft order" });

    // ✅ Apply all basic fields first (storeId, repId, note, deliveryDate, etc.)
    Object.assign(order, req.body);

    // ✅ Then rebuild the items safely if provided
    if (req.body.items && Array.isArray(req.body.items)) {
      const updatedItems = await Promise.all(
        req.body.items.map(async (item: any) => {
          const product = await Product.findById(item.product);
          if (!product) {
            throw new Error(`Product not found: ${item.product}`);
          }

          const variant =
            product.variants?.find((v) => v.label === item.unitLabel) ||
            product.variants?.[0];

          const price =
            variant?.discountPrice ??
            variant?.price ??
            product.discountPrice ??
            product.price ??
            0;

          return {
            product: product._id,
            name:
              product.itemName || product.subProductLine || product.productLine,
            unitLabel: variant?.label,
            unitPrice: variant?.price ?? product.price ?? 0,
            discountPrice: variant?.discountPrice ?? product.discountPrice ?? 0,
            qty: item.qty,
            lineTotal: price * item.qty,
          };
        })
      );

      order.items = updatedItems;
      order.subtotal = updatedItems.reduce((sum, i) => sum + i.lineTotal, 0);

      const discountValue = req.body.discountValue || 0;
      const discountType = req.body.discountType || "flat";

      const discountAmount =
        discountType === "flat"
          ? discountValue
          : (order.subtotal * discountValue) / 100;

      order.total = order.subtotal - discountAmount;
      order.discount = discountAmount;
    }

    await order.save();

    res.json({
      message: "Order updated successfully",
      order,
    });
  } catch (error: any) {
    console.error("Error updating order:", error);
    res
      .status(500)
      .json({ message: "Error updating order", error: error.message });
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
    res.status(500).json({ message: "Error collecting payment", error });
  }
};
