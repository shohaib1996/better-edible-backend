import { z } from "zod";
import { objectId, paginationQuery } from "./commonSchemas";

const intervalEnum = z.enum(["monthly", "bimonthly", "quarterly"]);

export const createClientSchema = z.object({
  storeId: objectId,
  contactEmail: z.string().email("Invalid email").optional(),
  assignedRepId: objectId,
  recurringSchedule: z.object({
    enabled: z.boolean(),
    interval: intervalEnum.optional(),
  }).optional(),
});

export const updateClientSchema = z.object({
  contactEmail: z.string().email("Invalid email").optional(),
  assignedRepId: objectId.optional(),
  status: z.enum(["onboarding", "active", "inactive", "churned"]).optional(),
  recurringSchedule: z.object({
    enabled: z.boolean(),
    interval: intervalEnum.optional(),
  }).optional(),
});

export const updateClientScheduleSchema = z.object({
  enabled: z.boolean({ error: "enabled is required" }),
  interval: intervalEnum.optional(),
});

export const getAllClientsQuery = paginationQuery.extend({
  status: z.string().optional(),
  repId: z.string().optional(),
  search: z.string().optional(),
});
