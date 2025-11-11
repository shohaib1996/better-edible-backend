// src/controllers/deliveryController.ts
import { Request, Response } from "express";
import { Delivery } from "../models/Delivery";
import { Rep } from "../models/Rep";
import { Store } from "../models/Store";

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
    } = req.body;

    const delivery = await Delivery.create({
      storeId,
      assignedTo,
      disposition,
      paymentAction,
      amount,
      scheduledAt,
      notes,
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
      page = 1,
      limit = 20,
    } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (storeId) query.storeId = storeId;
    if (scheduledAt) {
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
