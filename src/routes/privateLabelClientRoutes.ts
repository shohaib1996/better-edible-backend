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
router.get("/", getAllClients /* #swagger.tags = ['Private Label Clients'] */);
router.get("/with-approved-labels", getClientsWithApprovedLabels /* #swagger.tags = ['Private Label Clients'] */);
router.get("/:id", getClientById /* #swagger.tags = ['Private Label Clients'] */);

// POST routes
router.post("/", createClient /* #swagger.tags = ['Private Label Clients'] */);

// PUT/PATCH routes
router.put("/:id", updateClient /* #swagger.tags = ['Private Label Clients'] */);
router.patch("/:id", updateClient /* #swagger.tags = ['Private Label Clients'] */);
router.patch("/:id/schedule", updateClientSchedule /* #swagger.tags = ['Private Label Clients'] */);

// DELETE routes
router.delete("/:id", deleteClient /* #swagger.tags = ['Private Label Clients'] */);

export default router;
