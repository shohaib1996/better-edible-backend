import { z } from "zod";

export const enrollInPromotionsSchema = z.object({
  storeId: z.string().min(1),
});

export const approvePromotionEnrollmentSchema = z.object({
  notes: z.string().optional(),
  approvedBy: z.string().optional(),
});

export const rejectPromotionEnrollmentSchema = z.object({
  notes: z.string().optional(),
});

export const createPromotionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  sku: z.string().min(1),
  creditRatePerUnit: z.number().min(0),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  status: z.enum(["draft", "active", "expired"]).optional(),
  isPublic: z.boolean().optional(),
});

export const updatePromotionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  productId: z.string().min(1).optional(),
  productName: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  creditRatePerUnit: z.number().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["draft", "active", "expired"]).optional(),
  isPublic: z.boolean().optional(),
});

export const joinCompanyPromotionSchema = z.object({
  storeId: z.string().min(1),
});

export const createCustomPromotionSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  creditRatePerUnit: z.number().min(0),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export const logPromotionSalesSchema = z.object({
  storeId: z.string().min(1),
  unitsSold: z.number().int().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export const applyPromotionCreditSchema = z.object({
  storeId: z.string().min(1),
  amount: z.number().min(0.01),
  orderId: z.string().optional(),
  partnershipBillId: z.string().optional(),
  description: z.string().optional(),
});

export const posInboundPromotionSalesSchema = z.object({
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
