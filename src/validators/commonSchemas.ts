import { z } from "zod";

// Reusable MongoDB ObjectId string
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID format");

// Reusable pagination query params
export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(9999).optional().default(20),
});

// Reusable date string (YYYY-MM-DD or ISO)
export const dateString = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: "Invalid date format" }
);

// Reusable params with MongoDB :id
export const idParam = z.object({
  id: objectId,
});
