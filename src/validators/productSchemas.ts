import { z } from "zod";
import { objectId } from "./commonSchemas";

const variantSchema = z.object({
  label: z.string(),
  price: z.number().min(0).optional(),
  discountPrice: z.number().min(0).optional(),
});

export const createProductSchema = z.object({
  productLine: objectId,
  subProductLine: z.string().optional(),
  itemName: z.string().optional(),
  price: z.number().min(0).optional(),
  discountPrice: z.number().min(0).optional(),
  variants: z.array(variantSchema).optional(),
  priceDescription: z.string().optional(),
  discountDescription: z.string().optional(),
  applyDiscount: z.boolean().optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).catchall(z.number().optional());

export const updateProductSchema = createProductSchema.partial();

export const toggleProductStatusSchema = z.object({
  active: z.boolean({ error: "active is required" }),
});
