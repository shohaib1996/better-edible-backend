import { z } from "zod";

export const createColorSchema = z.object({
  name: z.string().min(1, "name is required"),
  hexPreview: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "hexPreview must be a valid hex color e.g. #FF0000")
    .optional(),
  defaultAmount: z.number().min(0).optional(),
});

export const updateColorSchema = z.object({
  name: z.string().min(1).optional(),
  hexPreview: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "hexPreview must be a valid hex color e.g. #FF0000")
    .optional(),
  defaultAmount: z.number().min(0).optional(),
});

export const getColorsQuery = z.object({
  isActive: z.enum(["true", "false"]).optional(),
});
