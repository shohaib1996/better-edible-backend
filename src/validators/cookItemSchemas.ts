import { z } from "zod";
import { paginationQuery } from "./commonSchemas";

export const createCookItemSchema = z.object({
  cookItemId: z.string().min(1, "Cook item ID is required"),
}).passthrough(); // allow all other cook item fields

export const updateCookItemStatusSchema = z.object({
  status: z.enum([
    "pending",
    "in-progress",
    "cooking_molding_complete",
    "dehydrating_complete",
    "demolding_complete",
    "packaging_casing_complete",
  ]),
});

export const getAllCookItemsQuery = paginationQuery.extend({
  status: z.string().optional(),
  orderId: z.string().optional(),
  customerId: z.string().optional(),
  privateLabOrderId: z.string().optional(),
});
