import { z } from "zod";
import { objectId, paginationQuery } from "./commonSchemas";

const performedBySchema = z.object({
  userId: z.string(),
  userName: z.string(),
  repType: z.string(),
}).optional();

const cookItemInputSchema = z.object({
  cookItemId: z.string().min(1, "cookItemId is required"),
  labelId: z.string().min(1, "labelId is required"),
  storeName: z.string().min(1, "storeName is required"),
  flavor: z.string().min(1, "flavor is required"),
  quantity: z.number().int().min(1, "quantity must be at least 1"),
  productType: z.string().min(1, "productType is required"),
  flavorComponents: z.any().optional(),
  colorComponents: z.any().optional(),
});

export const bulkCreateCookItemsSchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
  orderNumber: z.string().min(1, "orderNumber is required"),
  customerId: z.string().min(1, "customerId is required"),
  items: z.array(cookItemInputSchema).min(1, "items must not be empty").max(500, "Too many items"),
});

export const assignMoldSchema = z.object({
  cookItemId: z.string().min(1, "cookItemId is required"),
  moldId: z.string().min(1, "moldId is required"),
  unitsPerMold: z.number().int().min(1).optional(),
  performedBy: performedBySchema,
});

export const unassignMoldSchema = z.object({
  cookItemId: z.string().min(1, "cookItemId is required"),
  moldId: z.string().min(1, "moldId is required"),
  performedBy: performedBySchema,
});

export const completeStage1Schema = z.object({
  cookItemId: z.string().min(1, "cookItemId is required"),
  performedBy: performedBySchema,
});

export const processMoldSchema = z.object({
  cookItemId: z.string().min(1, "cookItemId is required"),
  moldId: z.string().min(1, "moldId is required"),
  trayId: z.string().min(1, "trayId is required"),
  dehydratorUnitId: z.string().min(1, "dehydratorUnitId is required"),
  shelfPosition: z.number().int().min(1, "shelfPosition must be at least 1"),
  performedBy: performedBySchema,
});

export const removeTraySchema = z.object({
  cookItemId: z.string().min(1, "cookItemId is required"),
  trayId: z.string().min(1, "trayId is required"),
  performedBy: performedBySchema,
});

export const completeStage3Schema = z.object({
  cookItemId: z.string().min(1, "cookItemId is required"),
  performedBy: performedBySchema,
});

export const scanContainerSchema = z.object({
  qrCodeData: z.string().min(1, "qrCodeData is required"),
  performedBy: performedBySchema,
});

export const confirmCountSchema = z.object({
  cookItemId: z.string().min(1, "cookItemId is required"),
  actualCount: z.number().int().min(0, "actualCount must be non-negative"),
  performedBy: performedBySchema,
});

export const bulkCreateResourceSchema = z.object({
  startNumber: z.number().int().min(1, "startNumber must be at least 1"),
  endNumber: z.number().int().min(1, "endNumber must be at least 1"),
  prefix: z.string().optional(),
  unitsPerMold: z.number().int().min(1).optional(),
  totalShelves: z.number().int().min(1).max(100).optional(),
}).refine((data) => data.endNumber >= data.startNumber, {
  message: "endNumber must be >= startNumber",
  path: ["endNumber"],
}).refine((data) => (data.endNumber - data.startNumber) <= 999, {
  message: "Cannot create more than 1000 items at once",
  path: ["endNumber"],
});

export const getStage1Query = paginationQuery.extend({
  status: z.string().optional(),
});

export const bulkDeleteMoldsSchema = z.object({
  moldIds: z.array(z.string().min(1)).min(1),
});

export const updateMoldStatusSchema = z.object({
  status: z.enum(["available", "in-use"]),
});

export const bulkDeleteTraysSchema = z.object({
  trayIds: z.array(z.string().min(1)).min(1),
});

export const updateTrayStatusSchema = z.object({
  status: z.enum(["available", "in-use"]),
});
