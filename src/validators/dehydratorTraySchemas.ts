import { z } from "zod";
import { paginationQuery } from "./commonSchemas";

export const createDehydratorTraySchema = z.object({
  trayId: z.string().min(1, "Tray ID is required"),
  qrCodeValue: z.string().optional(),
  status: z.enum(["available", "in-use"]).optional(),
});

export const updateDehydratorTraySchema = createDehydratorTraySchema.partial();

export const getAllDehydratorTraysQuery = paginationQuery.extend({
  status: z.enum(["available", "in-use"]).optional(),
  currentDehydratorUnitId: z.string().optional(),
});
