import { z } from "zod";

export const createPrivateLabelProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updatePrivateLabelProductSchema = createPrivateLabelProductSchema.partial();
