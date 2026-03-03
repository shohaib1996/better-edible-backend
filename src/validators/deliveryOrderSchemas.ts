import { z } from "zod";
import { objectId } from "./commonSchemas";

export const getDeliveryOrderQuery = z.object({
  repId: objectId,
  date: z.string().min(1, "Date is required"),
});

export const saveDeliveryOrderSchema = z.object({
  repId: objectId,
  date: z.string().min(1, "Date is required"),
  order: z.array(z.string()).min(1, "Order must be a non-empty array"),
});
