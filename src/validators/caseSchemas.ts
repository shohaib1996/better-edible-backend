import { z } from "zod";
import { paginationQuery } from "./commonSchemas";

export const createCaseSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  cookItemId: z.string().optional(),
  orderId: z.string().optional(),
  customerId: z.string().optional(),
  storeName: z.string().optional(),
  flavor: z.string().optional(),
  productType: z.string().optional(),
  unitCount: z.number().int().min(0).optional(),
  caseNumber: z.number().int().min(1).optional(),
  totalCasesForItem: z.number().int().min(1).optional(),
  status: z.string().optional(),
});

export const updateCaseSchema = createCaseSchema.partial();

export const updateCaseStatusSchema = z.object({
  status: z.string().min(1, "Status is required"),
});

export const getAllCasesQuery = paginationQuery.extend({
  status: z.string().optional(),
  cookItemId: z.string().optional(),
  orderId: z.string().optional(),
});
