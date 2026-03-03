import { z } from "zod";
import { objectId, paginationQuery, dateString } from "./commonSchemas";

export const createFollowupSchema = z.object({
  followupDate: dateString,
  store: objectId,
  rep: objectId,
  interestLevel: z.number().int().min(1).max(5).optional(),
  comments: z.string().optional(),
});

export const updateFollowupSchema = z.object({
  followupDate: dateString.optional(),
  store: objectId.optional(),
  rep: objectId.optional(),
  interestLevel: z.number().int().min(1).max(5).optional(),
  comments: z.string().optional(),
});

export const getAllFollowupsQuery = paginationQuery.extend({
  storeId: z.string().optional(),
  repId: z.string().optional(),
  storeName: z.string().optional(),
  date: z.string().optional(),
});
