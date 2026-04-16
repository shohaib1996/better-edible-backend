import { Router } from "express";
import {
  bulkCreateCookItems,
  getStage1CookItems,
  assignMold,
  unassignMold,
  completeStage1,
  setFlavorColor,
  editFlavorColor,
  getStage2CookItems,
  processMold,
  unprocessMold,
  getNextAvailableShelf,
  getStage2UnloadItems,
  completeUnload,
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
  startBagging,
  startSealing,
  completeBagSeal,
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
  unassignMoldSchema,
  completeStage1Schema,
  processMoldSchema,
  unprocessMoldSchema,
  removeTraySchema,
  completeStage3Schema,
  cookItemIdSchema,
  scanContainerSchema,
  confirmCountSchema,
  bulkCreateResourceSchema,
  getStage1Query,
  bulkDeleteMoldsSchema,
  updateMoldStatusSchema,
  bulkDeleteTraysSchema,
  updateTrayStatusSchema,
  unloadCompleteSchema,
  setFlavorColorSchema,
  editFlavorColorSchema,
} from "../validators/ppsSchemas";

const router = Router();

// Integration
router.post("/cook-items/bulk", validate({ body: bulkCreateCookItemsSchema }), bulkCreateCookItems /* #swagger.tags = ['PPS'] */);
router.get("/cook-items/:cookItemId/history", getCookItemHistory /* #swagger.tags = ['PPS'] */);

// Stage 1 - Cooking & Molding
router.get("/stage-1/cook-items", validate({ query: getStage1Query }), getStage1CookItems /* #swagger.tags = ['PPS'] */);
router.post("/stage-1/assign-mold", validate({ body: assignMoldSchema }), assignMold /* #swagger.tags = ['PPS'] */);
router.delete("/stage-1/unassign-mold", validate({ body: unassignMoldSchema }), unassignMold /* #swagger.tags = ['PPS'] */);
router.patch("/stage-1/complete", validate({ body: completeStage1Schema }), completeStage1 /* #swagger.tags = ['PPS'] */);
router.patch("/stage-1/set-flavor-color", validate({ body: setFlavorColorSchema }), setFlavorColor /* #swagger.tags = ['PPS'] */);
router.patch("/stage-1/edit-flavor-color", validate({ body: editFlavorColorSchema }), editFlavorColor /* #swagger.tags = ['PPS'] */);

// Stage 2 - Dehydrating
router.get("/stage-2/cook-items", getStage2CookItems /* #swagger.tags = ['PPS'] */);
router.post("/stage-2/process-mold", validate({ body: processMoldSchema }), processMold /* #swagger.tags = ['PPS'] */);
router.delete("/stage-2/unprocess-mold", validate({ body: unprocessMoldSchema }), unprocessMold /* #swagger.tags = ['PPS'] */);
router.get("/stage-2/next-available-shelf", getNextAvailableShelf /* #swagger.tags = ['PPS'] */);
router.get("/stage-2/unload-items", getStage2UnloadItems /* #swagger.tags = ['PPS'] */);
router.post("/stage-2/unload-complete", validate({ body: unloadCompleteSchema }), completeUnload /* #swagger.tags = ['PPS'] */);

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

// Stage 3 - Demolding & Bag/Seal
router.get("/stage-3/cook-items", getStage3CookItems /* #swagger.tags = ['PPS'] */);
router.post("/stage-3/remove-tray", validate({ body: removeTraySchema }), removeTray /* #swagger.tags = ['PPS'] */);
router.post("/stage-3/complete", validate({ body: completeStage3Schema }), completeStage3 /* #swagger.tags = ['PPS'] */);
router.post("/stage-3/start-bagging", validate({ body: cookItemIdSchema }), startBagging /* #swagger.tags = ['PPS'] */);
router.post("/stage-3/start-sealing", validate({ body: cookItemIdSchema }), startSealing /* #swagger.tags = ['PPS'] */);
router.post("/stage-3/bag-seal-complete", validate({ body: cookItemIdSchema }), completeBagSeal /* #swagger.tags = ['PPS'] */);

// Stage 4 - Packaging & Casing
router.get("/stage-4/cook-items", getStage4CookItems /* #swagger.tags = ['PPS'] */);
router.post("/stage-4/scan-container", validate({ body: scanContainerSchema }), scanContainer /* #swagger.tags = ['PPS'] */);
router.post("/stage-4/confirm-count", validate({ body: confirmCountSchema }), confirmCount /* #swagger.tags = ['PPS'] */);
router.get("/cases/:caseId", getCaseById /* #swagger.tags = ['PPS'] */);

export default router;
