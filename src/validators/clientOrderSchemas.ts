import { z } from "zod";
import { objectId, paginationQuery, dateString } from "./commonSchemas";

const clientOrderItemSchema = z.object({
  labelId: objectId,
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const createClientOrderSchema = z.object({
  clientId: objectId,
  deliveryDate: dateString.optional(),
  items: z.array(clientOrderItemSchema).min(1, "At least one item is required"),
  discount: z.number().min(0).optional(),
  discountType: z.enum(["flat", "percentage"]).optional(),
  note: z.string().optional(),
  shipASAP: z.boolean().optional(),
  userId: z.string().optional(),
  userType: z.enum(["admin", "rep"]).optional(),
});

export const updateClientOrderSchema = createClientOrderSchema.partial();

export const updateClientOrderStatusSchema = z.object({
  status: z.enum([
    "waiting",
    "cooking_molding",
    "dehydrating",
    "demolding",
    "packaging_casing",
    "ready_to_ship",
    "shipped",
    "cancelled",
  ]),
  trackingNumber: z.string().optional(),
});

export const updateDeliveryDateSchema = z.object({
  deliveryDate: dateString,
});

export const toggleShipASAPSchema = z.object({
  shipASAP: z.boolean({ error: "shipASAP is required" }),
});

export const getAllClientOrdersQuery = paginationQuery.extend({
  clientId: z.string().optional(),
  status: z.string().optional(),
  repId: z.string().optional(),
  search: z.string().optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
});
