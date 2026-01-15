// src/routes/privateLabelClientRoutes.ts
import { Router } from "express";
import {
  getAllClients,
  getClientById,
  getClientsWithApprovedLabels,
  createClient,
  updateClient,
  deleteClient,
  updateClientSchedule,
} from "../controllers/privateLabelClientController";

const router = Router();

// GET routes
router.get("/", getAllClients);
router.get("/with-approved-labels", getClientsWithApprovedLabels);
router.get("/:id", getClientById);

// POST routes
router.post("/", createClient);

// PUT/PATCH routes
router.put("/:id", updateClient);
router.patch("/:id", updateClient);
router.patch("/:id/schedule", updateClientSchedule);

// DELETE routes
router.delete("/:id", deleteClient);

export default router;
