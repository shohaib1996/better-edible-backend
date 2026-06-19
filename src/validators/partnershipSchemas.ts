import { z } from "zod";

export const joinPartnershipSchema = z.object({
  storeId: z.string().min(1),
});

export const approvePartnershipSchema = z.object({
  notes: z.string().optional(),
  approvedBy: z.string().optional(),
});

export const rejectPartnershipSchema = z.object({
  notes: z.string().optional(),
});

export const placeInventorySchema = z.object({
  productId: z.string().min(1),
  sku: z.string().min(1).max(50),
  wholesalePrice: z.number().min(0),
  unitsToAdd: z.number().int().min(1),
});

export const posInboundSalesSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  items: z
    .array(
      z.object({
        sku: z.string().min(1),
        unitsSold: z.number().int().min(0),
      })
    )
    .min(1),
});

export const generateBillSchema = z.object({
  year: z.number().int().min(2024),
  month: z.number().int().min(1).max(12),
});

export const applyCreditSchema = z.object({
  amount: z.number().min(0.01),
  reason: z.string().min(1),
});

export const updateBillStatusSchema = z.object({
  status: z.enum(["draft", "sent", "paid"]),
});

export const partnershipSalesQuerySchema = z.object({
  storeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
