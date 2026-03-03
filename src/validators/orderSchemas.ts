import { z } from "zod";
import { objectId, dateString } from "./commonSchemas";

const orderItemSchema = z.object({
  product: objectId,
  qty: z.number().int().min(1, "Quantity must be at least 1"),
  unitLabel: z.string().nullable().optional(),
  applyDiscount: z.boolean().optional(),
});

export const createOrderSchema = z.object({
  repId: objectId,
  storeId: objectId,
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  note: z.string().optional(),
  deliveryDate: dateString.optional(),
  discountType: z.enum(["flat", "percent"]).optional(),
  discountValue: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  userId: z.string().optional(),
  userType: z.enum(["admin", "rep"]).optional(),
});

export const updateOrderSchema = createOrderSchema.partial();

export const changeOrderStatusSchema = z.object({
  status: z.enum(["submitted", "accepted", "manifested", "shipped", "cancelled"]),
});

export const collectPaymentSchema = z.object({
  method: z.enum(["cash", "card", "check", "other"]),
  amount: z.number().min(0, "Amount must be non-negative"),
  repId: objectId,
  note: z.string().optional(),
});

export const getAllOrdersQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(999).optional().default(20),
  status: z.string().optional(),
  storeId: z.string().optional(),
  repId: z.string().optional(),
  repName: z.string().optional(),
  search: z.string().optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
});
