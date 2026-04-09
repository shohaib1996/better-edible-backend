import { z } from "zod";
import { objectId, paginationQuery, dateString } from "./commonSchemas";

export const createNoteSchema = z.object({
  entityId: objectId,
  deliveryId: z.string().optional(),
  author: z.string().min(1, "Author is required"),
  disposition: z.string().optional(),
  visitType: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  sample: z.boolean().optional(),
  delivery: z.boolean().optional(),
  payment: z.union([
    z.boolean(),
    z.object({
      cash: z.boolean().optional(),
      check: z.boolean().optional(),
      noPay: z.boolean().optional(),
      amount: z.union([z.string(), z.number()]).optional(),
    }),
  ]).optional(),
  date: dateString,
});

export const updateNoteSchema = createNoteSchema.partial().omit({ entityId: true, author: true });

export const getAllNotesQuery = paginationQuery.extend({
  entityId: z.string().optional(),
  deliveryId: z.string().optional(),
  repId: z.string().optional(),
  date: z.string().optional(),
});
