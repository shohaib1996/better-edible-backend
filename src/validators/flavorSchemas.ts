import { z } from "zod";

export const createFlavorSchema = z.object({
  name: z.string().min(1, "name is required"),
  defaultAmount: z.number().min(0).optional(),
});

export const findOrCreateBlendSchema = z.object({
  blendOf: z.array(z.string().min(1)).min(2, "blendOf must contain at least 2 flavorIds"),
  name: z.string().min(1).optional(),
  defaultAmount: z.number().min(0).optional(),
});

export const updateFlavorSchema = z.object({
  name: z.string().min(1).optional(),
  defaultAmount: z.number().min(0).optional(),
});

export const getFlavorsQuery = z.object({
  isActive: z.enum(["true", "false"]).optional(),
  isBlend: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
