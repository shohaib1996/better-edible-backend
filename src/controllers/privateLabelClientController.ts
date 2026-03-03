// src/controllers/privateLabelClientController.ts
import mongoose from "mongoose";
import { PrivateLabelClient } from "../models/PrivateLabelClient";
import { Label } from "../models/Label";
import { Store } from "../models/Store";
import { Rep } from "../models/Rep";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// GET ALL CLIENTS
export const getAllClients = asyncHandler(async (req, res) => {
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
});

// GET CLIENT BY ID
export const getClientById = asyncHandler(async (req, res) => {
  const client = await PrivateLabelClient.findById(req.params.id)
    .populate("store", "name address city state zip")
    .populate("assignedRep", "name email");

  if (!client) throw new AppError("Client not found", 404);

  res.json(client);
});

// GET CLIENTS WITH APPROVED LABELS (for order creation dropdown)
export const getClientsWithApprovedLabels = asyncHandler(async (req, res) => {
  const { search, limit = 10 } = req.query;

  // Find clients that have at least one label ready for production
  const clientsWithLabels = await Label.distinct("client", {
    currentStage: "ready_for_production",
  });

  // Build filter
  const filter: any = {
    _id: { $in: clientsWithLabels },
  };

  // If search is provided, find matching stores first
  if (search && typeof search === "string" && search.trim()) {
    const stores = await Store.find({
      name: { $regex: search.trim(), $options: "i" },
    }).select("_id");
    const storeIds = stores.map((s) => s._id);
    filter.store = { $in: storeIds };
  }

  const clients = await PrivateLabelClient.find(filter)
    .populate("store", "name city state")
    .select("_id store status")
    .limit(Number(limit));

  res.json(clients);
});

// CREATE CLIENT
export const createClient = asyncHandler(async (req, res) => {
  const { storeId, contactEmail, assignedRepId, recurringSchedule } =
    req.body;

  // Validate store exists
  const store = await Store.findById(storeId);
  if (!store) throw new AppError("Store not found", 404);

  // Check if store is already a client
  const existingClient = await PrivateLabelClient.findOne({ store: storeId });
  if (existingClient) {
    throw new AppError("This store is already enrolled in the private label program", 400);
  }

  // Validate rep exists
  const rep = await Rep.findById(assignedRepId);
  if (!rep) throw new AppError("Rep not found", 404);

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
});

// UPDATE CLIENT
export const updateClient = asyncHandler(async (req, res) => {
  const client = await PrivateLabelClient.findById(req.params.id);
  if (!client) throw new AppError("Client not found", 404);

  const { contactEmail, assignedRepId, recurringSchedule, status } = req.body;

  if (contactEmail !== undefined) {
    client.contactEmail = contactEmail;
  }

  if (assignedRepId !== undefined) {
    const rep = await Rep.findById(assignedRepId);
    if (!rep) throw new AppError("Rep not found", 404);
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
});

// DELETE CLIENT
export const deleteClient = asyncHandler(async (req, res) => {
  const client = await PrivateLabelClient.findById(req.params.id);
  if (!client) throw new AppError("Client not found", 404);

  // Check for active orders
  const { ClientOrder } = await import("../models/ClientOrder");
  const activeOrders = await ClientOrder.find({
    client: client._id,
    status: { $in: ["waiting", "cooking_molding", "dehydrating", "demolding", "packaging_casing"] },
  });

  if (activeOrders.length > 0) {
    throw new AppError("Cannot delete client with active orders", 400);
  }

  // Delete associated labels
  await Label.deleteMany({ client: client._id });

  await PrivateLabelClient.findByIdAndDelete(req.params.id);

  res.json({ message: "Client deleted successfully" });
});

// UPDATE CLIENT SCHEDULE
export const updateClientSchedule = asyncHandler(async (req, res) => {
  const client = await PrivateLabelClient.findById(req.params.id);
  if (!client) throw new AppError("Client not found", 404);

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
});
