import { z } from "zod";
import { objectId, paginationQuery } from "./commonSchemas";

export const createStoreSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  rep: z.string().optional(),
  terms: z.string().optional(),
  groups: z.array(z.string()).optional(),
});

export const updateStoreSchema = createStoreSchema.partial().extend({
  storeId: z.string().optional(),
});

export const getAllStoresQuery = paginationQuery.extend({
  search: z.string().optional(),
  repId: z.string().optional(),
  paymentStatus: z.enum(["green", "yellow", "red"]).optional(),
  isDue: z.enum(["true", "false"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const toggleBlockStoreSchema = z.object({
  blocked: z.boolean({ error: "blocked is required" }),
});

export const assignRepSchema = z.object({
  storeIds: z.array(objectId).min(1, "At least one store ID is required"),
  repId: objectId,
});

export const toggleBlockStoresSchema = z.object({
  storeIds: z.array(objectId).min(1, "At least one store ID is required"),
  blocked: z.boolean({ error: "blocked is required" }),
});
