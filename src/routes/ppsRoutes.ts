import { Router } from "express";
import {
  bulkCreateCookItems,
  getStage1CookItems,
  assignMold,
  completeStage1,
  getStage2CookItems,
  processMold,
  getNextAvailableShelf,
  getMolds,
  getDehydratorTrays,
  getDehydratorUnits,
  bulkCreateMolds,
  bulkCreateTrays,
  bulkCreateDehydratorUnits,
  bulkDeleteMolds,
  updateMoldStatus,
  bulkDeleteTrays,
  updateTrayStatus,
  getStage3CookItems,
  removeTray,
  completeStage3,
  getStage4CookItems,
  scanContainer,
  confirmCount,
  getCaseById,
  getCookItemHistory,
} from "../controllers/ppsController";
import { validate } from "../middleware/validate";
import {
  bulkCreateCookItemsSchema,
  assignMoldSchema,
  completeStage1Schema,
  processMoldSchema,
  removeTraySchema,
  completeStage3Schema,
  scanContainerSchema,
  confirmCountSchema,
  bulkCreateResourceSchema,
  getStage1Query,
  bulkDeleteMoldsSchema,
  updateMoldStatusSchema,
  bulkDeleteTraysSchema,
  updateTrayStatusSchema,
} from "../validators/ppsSchemas";

const router = Router();

// Integration
router.post("/cook-items/bulk", validate({ body: bulkCreateCookItemsSchema }), bulkCreateCookItems /* #swagger.tags = ['PPS'] */);
router.get("/cook-items/:cookItemId/history", getCookItemHistory /* #swagger.tags = ['PPS'] */);

// Stage 1 - Cooking & Molding
router.get("/stage-1/cook-items", validate({ query: getStage1Query }), getStage1CookItems /* #swagger.tags = ['PPS'] */);
router.post("/stage-1/assign-mold", validate({ body: assignMoldSchema }), assignMold /* #swagger.tags = ['PPS'] */);
router.patch("/stage-1/complete", validate({ body: completeStage1Schema }), completeStage1 /* #swagger.tags = ['PPS'] */);

// Stage 2 - Dehydrating
router.get("/stage-2/cook-items", getStage2CookItems /* #swagger.tags = ['PPS'] */);
router.post("/stage-2/process-mold", validate({ body: processMoldSchema }), processMold /* #swagger.tags = ['PPS'] */);
router.get("/stage-2/next-available-shelf", getNextAvailableShelf /* #swagger.tags = ['PPS'] */);

// Resources
router.get("/molds", getMolds /* #swagger.tags = ['PPS'] */);
router.get("/dehydrator-trays", getDehydratorTrays /* #swagger.tags = ['PPS'] */);
router.get("/dehydrator-units", getDehydratorUnits /* #swagger.tags = ['PPS'] */);

// Bulk Resource Creation
router.post("/molds/bulk", validate({ body: bulkCreateResourceSchema }), bulkCreateMolds /* #swagger.tags = ['PPS'] */);
router.delete("/molds/bulk", validate({ body: bulkDeleteMoldsSchema }), bulkDeleteMolds /* #swagger.tags = ['PPS'] */);
router.patch("/molds/:moldId/status", validate({ body: updateMoldStatusSchema }), updateMoldStatus /* #swagger.tags = ['PPS'] */);
router.post("/dehydrator-trays/bulk", validate({ body: bulkCreateResourceSchema }), bulkCreateTrays /* #swagger.tags = ['PPS'] */);
router.delete("/dehydrator-trays/bulk", validate({ body: bulkDeleteTraysSchema }), bulkDeleteTrays /* #swagger.tags = ['PPS'] */);
router.patch("/dehydrator-trays/:trayId/status", validate({ body: updateTrayStatusSchema }), updateTrayStatus /* #swagger.tags = ['PPS'] */);
router.post("/dehydrator-units/bulk", validate({ body: bulkCreateResourceSchema }), bulkCreateDehydratorUnits /* #swagger.tags = ['PPS'] */);

// Stage 3 - Demolding
router.get("/stage-3/cook-items", getStage3CookItems /* #swagger.tags = ['PPS'] */);
router.post("/stage-3/remove-tray", validate({ body: removeTraySchema }), removeTray /* #swagger.tags = ['PPS'] */);
router.post("/stage-3/complete", validate({ body: completeStage3Schema }), completeStage3 /* #swagger.tags = ['PPS'] */);

// Stage 4 - Packaging & Casing
router.get("/stage-4/cook-items", getStage4CookItems /* #swagger.tags = ['PPS'] */);
router.post("/stage-4/scan-container", validate({ body: scanContainerSchema }), scanContainer /* #swagger.tags = ['PPS'] */);
router.post("/stage-4/confirm-count", validate({ body: confirmCountSchema }), confirmCount /* #swagger.tags = ['PPS'] */);
router.get("/cases/:caseId", getCaseById /* #swagger.tags = ['PPS'] */);

export default router;
