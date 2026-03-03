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
  getStage3CookItems,
  removeTray,
  completeStage3,
  scanContainer,
  confirmCount,
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
} from "../validators/ppsSchemas";

const router = Router();

// Integration
router.post("/cook-items/bulk", validate({ body: bulkCreateCookItemsSchema }), bulkCreateCookItems /* #swagger.tags = ['PPS'] */);

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
router.post("/dehydrator-trays/bulk", validate({ body: bulkCreateResourceSchema }), bulkCreateTrays /* #swagger.tags = ['PPS'] */);
router.post("/dehydrator-units/bulk", validate({ body: bulkCreateResourceSchema }), bulkCreateDehydratorUnits /* #swagger.tags = ['PPS'] */);

// Stage 3 - Demolding
router.get("/stage-3/cook-items", getStage3CookItems /* #swagger.tags = ['PPS'] */);
router.post("/stage-3/remove-tray", validate({ body: removeTraySchema }), removeTray /* #swagger.tags = ['PPS'] */);
router.post("/stage-3/complete", validate({ body: completeStage3Schema }), completeStage3 /* #swagger.tags = ['PPS'] */);

// Stage 4 - Packaging & Casing
router.post("/stage-4/scan-container", validate({ body: scanContainerSchema }), scanContainer /* #swagger.tags = ['PPS'] */);
router.post("/stage-4/confirm-count", validate({ body: confirmCountSchema }), confirmCount /* #swagger.tags = ['PPS'] */);

export default router;
