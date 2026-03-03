import { z } from "zod";
import { paginationQuery } from "./commonSchemas";

export const createMoldSchema = z.object({
  moldId: z.string().min(1, "Mold ID is required"),
  barcodeValue: z.string().optional(),
  unitsPerMold: z.number().int().min(1).optional(),
  status: z.enum(["available", "in-use"]).optional(),
});

export const updateMoldSchema = createMoldSchema.partial();

export const getAllMoldsQuery = paginationQuery.extend({
  status: z.enum(["available", "in-use"]).optional(),
});
