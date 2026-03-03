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
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  createClientSchema,
  updateClientSchema,
  updateClientScheduleSchema,
  getAllClientsQuery,
} from "../validators/privateLabelClientSchemas";

const router = Router();

// GET routes
router.get("/", validate({ query: getAllClientsQuery }), getAllClients /* #swagger.tags = ['Private Label Clients'] */);
router.get("/with-approved-labels", getClientsWithApprovedLabels /* #swagger.tags = ['Private Label Clients'] */);
router.get("/:id", validate({ params: idParam }), getClientById /* #swagger.tags = ['Private Label Clients'] */);

// POST routes
router.post("/", validate({ body: createClientSchema }), createClient /* #swagger.tags = ['Private Label Clients'] */);

// PUT/PATCH routes
router.put("/:id", validate({ params: idParam, body: updateClientSchema }), updateClient /* #swagger.tags = ['Private Label Clients'] */);
router.patch("/:id", validate({ params: idParam, body: updateClientSchema }), updateClient /* #swagger.tags = ['Private Label Clients'] */);
router.patch("/:id/schedule", validate({ params: idParam, body: updateClientScheduleSchema }), updateClientSchedule /* #swagger.tags = ['Private Label Clients'] */);

// DELETE routes
router.delete("/:id", validate({ params: idParam }), deleteClient /* #swagger.tags = ['Private Label Clients'] */);

export default router;
