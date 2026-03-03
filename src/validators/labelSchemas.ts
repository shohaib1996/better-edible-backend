import { z } from "zod";
import { objectId, paginationQuery } from "./commonSchemas";

const labelStages = [
  "draft",
  "in_review",
  "revision_requested",
  "approved",
  "ready_for_production",
] as const;

export const updateLabelStageSchema = z.object({
  stage: z.enum(labelStages),
  notes: z.string().optional(),
  userId: z.string().optional(),
  userType: z.enum(["admin", "rep"]).optional(),
});

export const bulkUpdateLabelStagesSchema = z.object({
  clientId: objectId,
  stage: z.enum(labelStages),
  notes: z.string().optional(),
  userId: z.string().optional(),
  userType: z.enum(["admin", "rep"]).optional(),
});

export const getAllLabelsQuery = paginationQuery.extend({
  clientId: z.string().optional(),
  stage: z.string().optional(),
  productType: z.string().optional(),
});
