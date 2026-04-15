import { z } from "zod";
import { paginationQuery } from "./commonSchemas";

const performedBySchema = z.object({
  userId: z.string(),
  userName: z.string(),
}).optional();

// ─────────────────────────────
// Container schemas
// ─────────────────────────────

export const createContainerSchema = z.object({
  containerId: z.string().min(1, "containerId is required"),
  name: z.string().min(1, "name is required"),
  cannabisType: z.enum(["BioMax", "Rosin"] as const, {
    error: "cannabisType must be BioMax or Rosin",
  }),
  potency: z
    .number({ error: "potency is required" })
    .min(0.1, "potency must be > 0")
    .max(100, "potency cannot exceed 100"),
  totalAmount: z
    .number({ error: "totalAmount is required" })
    .min(0.1, "totalAmount must be > 0"),
  performedBy: performedBySchema,
});

export const refillContainerSchema = z.object({
  amount: z
    .number({ error: "amount is required" })
    .min(0.1, "amount must be > 0"),
  performedBy: performedBySchema,
});

export const cleanContainerSchema = z.object({
  notes: z.string().optional(),
  performedBy: performedBySchema,
});

export const calculatePullSchema = z.object({
  moldCount: z.coerce
    .number()
    .int()
    .min(1, "moldCount must be at least 1"),
});

export const drawdownSchema = z.object({
  cookItemId: z.string().min(1, "cookItemId is required"),
  containerId: z.string().min(1, "containerId is required"),
  actualAmount: z
    .number({ error: "actualAmount is required" })
    .min(0.1, "actualAmount must be > 0"),
  performedBy: performedBySchema,
});

export const getContainersQuery = paginationQuery.extend({
  status: z.enum(["active", "empty", "cleaning"] as const).optional(),
  cannabisType: z.enum(["BioMax", "Rosin"] as const).optional(),
});

// ─────────────────────────────
// Waste log schemas
// ─────────────────────────────

export const createWasteLogSchema = z.object({
  date: z.string().refine((v) => !isNaN(Date.parse(v)), {
    message: "Invalid date format",
  }),
  material: z.enum(["BioMax", "Rosin"] as const, {
    error: "material must be BioMax or Rosin",
  }),
  amount: z
    .number({ error: "amount is required" })
    .min(0.01, "amount must be > 0"),
  reason: z.enum(["cleaning", "spillage", "other"] as const, {
    error: "reason must be cleaning, spillage, or other",
  }),
  sourceContainerId: z.string().min(1, "sourceContainerId is required"),
  notes: z.string().optional(),
  performedBy: performedBySchema,
});

export const getWasteLogsQuery = paginationQuery.extend({
  material: z.enum(["BioMax", "Rosin"] as const).optional(),
  reason: z.enum(["cleaning", "spillage", "other"] as const).optional(),
  sourceContainerId: z.string().optional(),
});
