// src/controllers/privateLabelClientController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { PrivateLabelClient } from "../models/PrivateLabelClient";
import { Label } from "../models/Label";
import { Store } from "../models/Store";
import { Rep } from "../models/Rep";

// GET ALL CLIENTS
export const getAllClients = async (req: Request, res: Response) => {
  try {
    const { status, repId, search, page = 1, limit = 20 } = req.query;

    const filter: any = {};

    if (status) filter.status = status;
    if (repId && mongoose.Types.ObjectId.isValid(String(repId))) {
      filter.assignedRep = new mongoose.Types.ObjectId(String(repId));
    }

    // Search by store name
    if (search && typeof search === "string" && search.trim()) {
      const stores = await Store.find({
        name: { $regex: search.trim(), $options: "i" },
      }).select("_id");
      const storeIds = stores.map((s) => s._id);
      filter.store = { $in: storeIds };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [clients, total] = await Promise.all([
      PrivateLabelClient.find(filter)
        .populate("store", "name address city state zip")
        .populate("assignedRep", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      PrivateLabelClient.countDocuments(filter),
    ]);

    // Calculate label counts for each client
    const clientsWithCounts = await Promise.all(
      clients.map(async (client) => {
        const [approved, inProgress] = await Promise.all([
          Label.countDocuments({
            client: client._id,
            currentStage: "ready_for_production",
          }),
          Label.countDocuments({
            client: client._id,
            currentStage: { $ne: "ready_for_production" },
          }),
        ]);

        return {
          ...client.toObject(),
          labelCounts: {
            approved,
            inProgress,
          },
        };
      })
    );

    res.json({
      total,
      clients: clientsWithCounts,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error: any) {
    console.error("Error fetching clients:", error);
    res.status(500).json({
      message: "Error fetching clients",
      error: error.message,
    });
  }
};

// GET CLIENT BY ID
export const getClientById = async (req: Request, res: Response) => {
  try {
    const client = await PrivateLabelClient.findById(req.params.id)
      .populate("store", "name address city state zip")
      .populate("assignedRep", "name email");

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json(client);
  } catch (error: any) {
    console.error("Error fetching client:", error);
    res.status(500).json({
      message: "Error fetching client",
      error: error.message,
    });
  }
};

// GET CLIENTS WITH APPROVED LABELS (for order creation dropdown)
export const getClientsWithApprovedLabels = async (
  req: Request,
  res: Response
) => {
  try {
    // Find clients that have at least one label ready for production
    const clientsWithLabels = await Label.distinct("client", {
      currentStage: "ready_for_production",
    });

    const clients = await PrivateLabelClient.find({
      _id: { $in: clientsWithLabels },
    })
      .populate("store", "name city state")
      .select("_id store status");

    res.json(clients);
  } catch (error: any) {
    console.error("Error fetching clients with approved labels:", error);
    res.status(500).json({
      message: "Error fetching clients",
      error: error.message,
    });
  }
};

// CREATE CLIENT
export const createClient = async (req: Request, res: Response) => {
  try {
    const { storeId, contactEmail, assignedRepId, recurringSchedule } =
      req.body;

    // Validate store exists
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    // Check if store is already a client
    const existingClient = await PrivateLabelClient.findOne({ store: storeId });
    if (existingClient) {
      return res.status(400).json({
        message: "This store is already enrolled in the private label program",
      });
    }

    // Validate rep exists
    const rep = await Rep.findById(assignedRepId);
    if (!rep) {
      return res.status(404).json({ message: "Rep not found" });
    }

    // Create client
    const client = await PrivateLabelClient.create({
      store: storeId,
      contactEmail,
      assignedRep: assignedRepId,
      status: "onboarding",
      recurringSchedule: recurringSchedule || { enabled: false },
    });

    await client.populate("store", "name address city state zip");
    await client.populate("assignedRep", "name email");

    res.status(201).json({
      message: "Client created successfully",
      client,
    });
  } catch (error: any) {
    console.error("Error creating client:", error);
    res.status(500).json({
      message: "Error creating client",
      error: error.message,
    });
  }
};

// UPDATE CLIENT
export const updateClient = async (req: Request, res: Response) => {
  try {
    const client = await PrivateLabelClient.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const { contactEmail, assignedRepId, recurringSchedule, status } = req.body;

    if (contactEmail !== undefined) {
      client.contactEmail = contactEmail;
    }

    if (assignedRepId !== undefined) {
      const rep = await Rep.findById(assignedRepId);
      if (!rep) {
        return res.status(404).json({ message: "Rep not found" });
      }
      client.assignedRep = assignedRepId;
    }

    if (recurringSchedule !== undefined) {
      client.recurringSchedule = recurringSchedule;
    }

    if (status !== undefined) {
      client.status = status;
    }

    await client.save();
    await client.populate("store", "name address city state zip");
    await client.populate("assignedRep", "name email");

    res.json({
      message: "Client updated successfully",
      client,
    });
  } catch (error: any) {
    console.error("Error updating client:", error);
    res.status(500).json({
      message: "Error updating client",
      error: error.message,
    });
  }
};

// DELETE CLIENT
export const deleteClient = async (req: Request, res: Response) => {
  try {
    const client = await PrivateLabelClient.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Check for active orders
    const { ClientOrder } = await import("../models/ClientOrder");
    const activeOrders = await ClientOrder.find({
      client: client._id,
      status: { $in: ["waiting", "stage_1", "stage_2", "stage_3", "stage_4"] },
    });

    if (activeOrders.length > 0) {
      return res.status(400).json({
        message: "Cannot delete client with active orders",
      });
    }

    // Delete associated labels
    await Label.deleteMany({ client: client._id });

    await PrivateLabelClient.findByIdAndDelete(req.params.id);

    res.json({ message: "Client deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting client:", error);
    res.status(500).json({
      message: "Error deleting client",
      error: error.message,
    });
  }
};

// UPDATE CLIENT SCHEDULE
export const updateClientSchedule = async (req: Request, res: Response) => {
  try {
    const client = await PrivateLabelClient.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const { enabled, interval } = req.body;

    client.recurringSchedule.enabled = enabled;
    if (enabled && interval !== undefined) {
      client.recurringSchedule.interval = interval;
    }

    await client.save();

    res.json({
      message: "Schedule updated successfully",
      client,
    });
  } catch (error: any) {
    console.error("Error updating schedule:", error);
    res.status(500).json({
      message: "Error updating schedule",
      error: error.message,
    });
  }
};
