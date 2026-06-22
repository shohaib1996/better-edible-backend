import { z } from "zod";

export const createPromotionSchema = z.object({
  name: z.string().min(1).trim(),
  code: z.string().trim().toUpperCase().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  type: z.enum(["flat", "percentage"]),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).optional().nullable(),
  maxUses: z.number().int().min(1).optional().nullable(),
  maxUsesPerStore: z.number().int().min(1).optional().nullable(),
  storeIds: z.array(z.string()).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
  isPublic: z.boolean().optional(),
  autoApply: z.boolean().optional(),
});

export const updatePromotionSchema = createPromotionSchema;

export const validatePromoCodeSchema = z.object({
  code: z.string().min(1).trim(),
  storeId: z.string().min(1),
  orderTotal: z.number().min(0),
});

export const applyPromoToOrderSchema = z
  .object({
    promotionId: z.string().optional(),
    code: z.string().trim().optional(),
    storeId: z.string().min(1),
    orderId: z.string().min(1),
  })
  .refine((d) => d.promotionId || d.code, {
    message: "promotionId or code is required",
  });
