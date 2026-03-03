import { z } from "zod";
import { objectId, paginationQuery, dateString } from "./commonSchemas";

export const createDeliverySchema = z.object({
  storeId: objectId,
  assignedTo: objectId,
  disposition: z.string().min(1, "Disposition is required"),
  paymentAction: z.string().optional(),
  amount: z.number().min(0).optional(),
  scheduledAt: dateString,
  notes: z.string().optional(),
  orderId: objectId.optional(),
  sampleId: objectId.optional(),
  clientOrderId: objectId.optional(),
});

export const updateDeliverySchema = createDeliverySchema.partial();

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(["scheduled", "completed", "cancelled", "pending"]),
});

export const getAllDeliveriesQuery = paginationQuery.extend({
  status: z.string().optional(),
  assignedTo: z.string().optional(),
  storeId: z.string().optional(),
  storeName: z.string().optional(),
  scheduledAt: z.string().optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
});
