import { z } from "zod";
import { paginationQuery } from "./commonSchemas";

export const createDehydratorUnitSchema = z.object({
  unitId: z.string().min(1, "Unit ID is required"),
  totalShelves: z.number().int().min(1).optional(),
});

export const updateDehydratorUnitSchema = z.object({
  unitId: z.string().min(1).optional(),
  totalShelves: z.number().int().min(1).optional(),
});

export const updateShelfSchema = z.object({
  occupied: z.boolean().optional(),
  trayId: z.string().optional(),
  cookItemId: z.string().optional(),
});

export const getAllDehydratorUnitsQuery = paginationQuery;
