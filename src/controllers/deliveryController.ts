// src/controllers/deliveryController.ts
import { Request, Response } from "express";
import { Delivery } from "../models/Delivery";
import { Rep } from "../models/Rep";
import { Store } from "../models/Store";
import { PrivateLabel } from "../models/PrivateLabel";
import { Order } from "../models/Order";
import Sample from "../models/Sample";

// 🟩 Create delivery assignment
export const createDelivery = async (req: Request, res: Response) => {
  try {
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
      privateLabelOrderId,
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
      privateLabelOrderId,
      status: "in_transit",
    });

    res
      .status(201)
      .json({ message: "Delivery created successfully", delivery });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error creating delivery", error: error.message });
  }
};

// 🟨 Get all deliveries
export const getAllDeliveries = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Error fetching deliveries", error });
  }
};

// 🟦 Get delivery by ID
export const getDeliveryById = async (req: Request, res: Response) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate("assignedTo", "name repType")
      .populate("storeId", "name address city state");

    if (!delivery)
      return res.status(404).json({ message: "Delivery not found" });
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: "Error fetching delivery", error });
  }
};

// 🟨 Update delivery
export const updateDelivery = async (req: Request, res: Response) => {
  try {
    if (req.body.paymentAction === "") {
      req.body.paymentAction = undefined;
    }

    // Explicitly handle orderId and sampleId in updates too if sent
    const delivery = await Delivery.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }
    res.json({ message: "Delivery updated successfully", delivery });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error updating delivery", error: error.message });
  }
};

// 🟧 Update delivery status
export const updateDeliveryStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "assigned", "completed", "cancelled"];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery)
      return res.status(404).json({ message: "Delivery not found" });

    delivery.status = status;
    await delivery.save();

    // Update linked private label order status when delivery is completed or cancelled
    if (delivery.privateLabelOrderId) {
      if (status === "completed") {
        await PrivateLabel.findByIdAndUpdate(delivery.privateLabelOrderId, {
          status: "shipped",
          deliveryDate: new Date(),
        });
      } else if (status === "cancelled") {
        await PrivateLabel.findByIdAndUpdate(delivery.privateLabelOrderId, {
          status: "cancelled",
        });
      }
    }

    // Update linked regular order status when delivery is completed or cancelled
    if (delivery.orderId) {
      if (status === "completed") {
        await Order.findByIdAndUpdate(delivery.orderId, {
          status: "shipped",
          deliveryDate: new Date(),
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
          deliveryDate: new Date(),
        });
      } else if (status === "cancelled") {
        await Sample.findByIdAndUpdate(delivery.sampleId, {
          status: "cancelled",
        });
      }
    }

    res.json({ message: `Delivery marked as ${status}`, delivery });
  } catch (error) {
    res.status(500).json({ message: "Error updating delivery status", error });
  }
};

// 🟥 Delete delivery
export const deleteDelivery = async (req: Request, res: Response) => {
  try {
    const delivery = await Delivery.findByIdAndDelete(req.params.id);
    if (!delivery)
      return res.status(404).json({ message: "Delivery not found" });
    res.json({ message: "Delivery deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting delivery", error });
  }
};
