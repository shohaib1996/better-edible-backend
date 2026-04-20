import { z } from "zod";

const pricingStructureSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("simple"),
  }),
  z.object({
    type: z.literal("variants"),
    variantLabels: z.array(z.string()).min(1, "Variant labels are required"),
  }),
  z.object({
    type: z.literal("multi-type"),
    typeLabels: z.array(z.string()).min(1, "Type labels are required"),
  }),
]);

export const createProductLineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  displayOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  pricingStructure: pricingStructureSchema,
  fields: z.array(z.any()).optional(),
  description: z.string().optional(),
});

export const updateProductLineSchema = createProductLineSchema.partial();

export const toggleProductLineStatusSchema = z.object({
  active: z.boolean({ error: "active is required" }),
});

export const reorderProductLinesSchema = z.object({
  order: z
    .array(
      z.object({
        id: z.string().min(1),
        displayOrder: z.number().int().min(0),
      })
    )
    .min(1, "Order array is required"),
});
