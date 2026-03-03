import { z } from "zod";
import { objectId, paginationQuery, dateString } from "./commonSchemas";

export const createFollowupSchema = z.object({
  followupDate: dateString,
  store: objectId,
  rep: objectId,
  interestLevel: z.string().optional(),
  comments: z.string().optional(),
});

export const updateFollowupSchema = z.object({
  followupDate: dateString.optional(),
  store: objectId.optional(),
  rep: objectId.optional(),
  interestLevel: z.string().optional(),
  comments: z.string().optional(),
});

export const getAllFollowupsQuery = paginationQuery.extend({
  storeId: z.string().optional(),
  repId: z.string().optional(),
  storeName: z.string().optional(),
  date: z.string().optional(),
});
