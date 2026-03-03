import { z } from "zod";
import { objectId, paginationQuery } from "./commonSchemas";

export const createSampleSchema = z.object({
  repId: objectId,
  storeId: objectId,
  description: z.string().min(1, "Description is required"),
  notes: z.string().optional(),
  userId: z.string().optional(),
  userType: z.enum(["admin", "rep"]).optional(),
});

export const updateSampleStatusSchema = z.object({
  status: z.enum(["submitted", "approved", "rejected", "delivered"]),
});

export const getAllSamplesQuery = paginationQuery.extend({
  repId: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
});
