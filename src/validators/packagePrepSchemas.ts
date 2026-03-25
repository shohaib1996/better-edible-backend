import { z } from "zod";

export const createLabelOrderSchema = z.object({
  storeId: z.string().min(1),
  labelId: z.string().min(1),
  quantityOrdered: z.number().int().min(1),
  notes: z.string().optional(),
});

export const receiveLabelOrderSchema = z.object({
  quantityReceived: z.number().int().min(1),
});

export const applyLabelsSchema = z.object({
  storeId: z.string().min(1),
  labelId: z.string().min(1),
  quantity: z.number().int().min(1),
});

export const printLabelsSchema = z.object({
  storeId: z.string().min(1),
  labelId: z.string().min(1),
  quantity: z.number().int().min(1),
  lotNumber: z.string().min(1),
  thcPercent: z.string().min(1),
  testDate: z.string().min(1),
});

export const setReorderThresholdSchema = z.object({
  reorderThreshold: z.number().int().min(0),
});

export const getLabelInventoryQuerySchema = z.object({
  storeId: z.string().optional(),
});
