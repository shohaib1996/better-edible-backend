// src/controllers/clientOrderController.ts
import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { ClientOrder, IClientOrderItem } from "../models/ClientOrder";
import { PrivateLabelClient } from "../models/PrivateLabelClient";
import { Label } from "../models/Label";
import { PrivateLabelProduct } from "../models/PrivateLabelProduct";

// Helper to get unit price by product type from database
async function getUnitPriceByProductType(productType: string): Promise<number> {
  const product = await PrivateLabelProduct.findOne({
    name: productType,
    isActive: true,
  });
  return product?.unitPrice || 0;
}

// GET ALL CLIENT ORDERS
export const getAllClientOrders = async (req: Request, res: Response) => {
  try {
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

      if (search.toUpperCase().startsWith("CO-")) {
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

    const [orders, total] = await Promise.all([
      ClientOrder.find(filter)
        .populate({
          path: "client",
          populate: {
            path: "store",
            select: "name address city state",
          },
        })
        .populate("assignedRep", "name email")
        .populate("items.label", "flavorName productType labelImages")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ClientOrder.countDocuments(filter),
    ]);

    res.json({
      total,
      orders,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error: any) {
    console.error("Error fetching client orders:", error);
    res.status(500).json({
      message: "Error fetching client orders",
      error: error.message,
    });
  }
};

// GET CLIENT ORDER BY ID
export const getClientOrderById = async (req: Request, res: Response) => {
  try {
    const order = await ClientOrder.findById(req.params.id)
      .populate({
        path: "client",
        populate: {
          path: "store",
          select: "name address city state zip",
        },
      })
      .populate("assignedRep", "name email")
      .populate("items.label", "flavorName productType labelImages");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error: any) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      message: "Error fetching order",
      error: error.message,
    });
  }
};

// CREATE CLIENT ORDER
// NOTE: shipASAP can be set at order creation (checkbox option)
export const createClientOrder = async (req: Request, res: Response) => {
  try {
    const {
      clientId,
      deliveryDate,
      items,
      discount = 0,
      discountType = "flat",
      note,
      shipASAP = false, // Can be set at order creation
    } = req.body;

    // Validate client
    const client = await PrivateLabelClient.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    // Process items - get unit price from product type (FIXED pricing)
    const processedItems = await Promise.all(
      items.map(async (item: any) => {
        const label = await Label.findById(item.labelId);

        if (!label) {
          throw new Error(`Label ${item.labelId} not found`);
        }

        if (label.currentStage !== "ready_for_production") {
          throw new Error(
            `Label "${label.flavorName}" is not ready for production`
          );
        }

        if (label.client.toString() !== clientId.toString()) {
          throw new Error(`Label does not belong to this client`);
        }

        if (!item.quantity || item.quantity <= 0) {
          throw new Error("Quantity must be greater than 0");
        }

        // Get unit price from product type (from database)
        const unitPrice = await getUnitPriceByProductType(label.productType);
        if (unitPrice === 0) {
          throw new Error(
            `Product type "${label.productType}" not found or has no price set`
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
        return res.status(400).json({
          message: "Percentage discount must be between 0 and 100",
        });
      }
      discountAmount = Number(((subtotal * discount) / 100).toFixed(2));
    } else {
      if (discount < 0) {
        return res.status(400).json({ message: "Discount cannot be negative" });
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
    });

    order.calculateProductionStart();
    await order.save();

    await order.populate({
      path: "client",
      populate: { path: "store", select: "name" },
    });
    await order.populate("assignedRep", "name email");

    // Send order created email to client (async, don't block response)
    import("../jobs/clientOrderJobs").then(({ sendOrderCreatedNotification }) => {
      sendOrderCreatedNotification(order, false);
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

// UPDATE CLIENT ORDER
export const updateClientOrder = async (req: Request, res: Response) => {
  try {
    const order = await ClientOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!order.canEdit()) {
      return res.status(400).json({
        message: "Order cannot be edited once in production",
      });
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
            throw new Error(`Label ${item.labelId} not found`);
          }

          if (label.currentStage !== "ready_for_production") {
            throw new Error(
              `Label "${label.flavorName}" is not ready for production`
            );
          }

          // Get unit price from product type (from database)
          const unitPrice = await getUnitPriceByProductType(label.productType);
          if (unitPrice === 0) {
            throw new Error(
              `Product type "${label.productType}" not found or has no price set`
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
  } catch (error: any) {
    console.error("Error updating order:", error);
    res.status(500).json({
      message: "Error updating order",
      error: error.message,
    });
  }
};

// UPDATE ORDER STATUS
export const updateClientOrderStatus = async (req: Request, res: Response) => {
  try {
    const order = await ClientOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const { status, trackingNumber } = req.body;

    const validStatuses = [
      "waiting",
      "stage_1",
      "stage_2",
      "stage_3",
      "stage_4",
      "ready_to_ship",
      "shipped",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const previousStatus = order.status;
    order.status = status;

    // Handle stage_1 (production started) - send notification email
    if (status === "stage_1" && previousStatus !== "stage_1") {
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
      // Send shipped notification to client and rep (async, don't block response)
      import("../jobs/clientOrderJobs").then(({ sendShippedNotification }) => {
        sendShippedNotification(order);
      });
      // Create recurring order if applicable (async, don't block response)
      import("../jobs/clientOrderJobs").then(({ createRecurringOrder }) => {
        createRecurringOrder(order);
      });
    } else {
      await order.save();
    }

    res.json({
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error: any) {
    console.error("Error updating status:", error);
    res.status(500).json({
      message: "Error updating status",
      error: error.message,
    });
  }
};

// PUSH ORDER TO PPS (Production Planning System)
export const pushOrderToPPS = async (req: Request, res: Response) => {
  try {
    const order = await ClientOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "waiting") {
      return res.status(400).json({
        message: "Order is not in waiting status",
      });
    }

    order.status = "stage_1";
    await order.save();

    // Send production started email to client (async, don't block response)
    import("../jobs/clientOrderJobs").then(({ sendProductionStartedNotification }) => {
      sendProductionStartedNotification(order);
    });

    // TODO: Actually push to PPS system

    res.json({
      message: "Order pushed to production",
      order,
    });
  } catch (error: any) {
    console.error("Error pushing to PPS:", error);
    res.status(500).json({
      message: "Error pushing to PPS",
      error: error.message,
    });
  }
};

// UPDATE DELIVERY DATE
export const updateDeliveryDate = async (req: Request, res: Response) => {
  try {
    const order = await ClientOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const { deliveryDate } = req.body;

    if (!deliveryDate) {
      return res.status(400).json({ message: "Delivery date is required" });
    }

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
  } catch (error: any) {
    console.error("Error updating delivery date:", error);
    res.status(500).json({
      message: "Error updating delivery date",
      error: error.message,
    });
  }
};

// TOGGLE SHIP ASAP
export const toggleShipASAP = async (req: Request, res: Response) => {
  try {
    const order = await ClientOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const { shipASAP } = req.body;

    order.shipASAP = shipASAP !== undefined ? shipASAP : !order.shipASAP;
    await order.save();

    res.json({
      message: order.shipASAP
        ? "Order marked for immediate shipping"
        : "Ship ASAP disabled",
      order,
    });
  } catch (error: any) {
    console.error("Error toggling ship ASAP:", error);
    res.status(500).json({
      message: "Error toggling ship ASAP",
      error: error.message,
    });
  }
};

// DELETE CLIENT ORDER
export const deleteClientOrder = async (req: Request, res: Response) => {
  try {
    const order = await ClientOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.isInProduction()) {
      return res.status(400).json({
        message: "Cannot delete order in production",
      });
    }

    await ClientOrder.findByIdAndDelete(req.params.id);

    res.json({ message: "Order deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting order:", error);
    res.status(500).json({
      message: "Error deleting order",
      error: error.message,
    });
  }
};
