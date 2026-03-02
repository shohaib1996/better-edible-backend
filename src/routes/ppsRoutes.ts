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

const router = Router();

// Integration
router.post("/cook-items/bulk", bulkCreateCookItems /* #swagger.tags = ['PPS'] */);

// Stage 1 - Cooking & Molding
router.get("/stage-1/cook-items", getStage1CookItems /* #swagger.tags = ['PPS'] */);
router.post("/stage-1/assign-mold", assignMold /* #swagger.tags = ['PPS'] */);
router.patch("/stage-1/complete", completeStage1 /* #swagger.tags = ['PPS'] */);

// Stage 2 - Dehydrating
router.get("/stage-2/cook-items", getStage2CookItems /* #swagger.tags = ['PPS'] */);
router.post("/stage-2/process-mold", processMold /* #swagger.tags = ['PPS'] */);
router.get("/stage-2/next-available-shelf", getNextAvailableShelf /* #swagger.tags = ['PPS'] */);

// Resources
router.get("/molds", getMolds /* #swagger.tags = ['PPS'] */);
router.get("/dehydrator-trays", getDehydratorTrays /* #swagger.tags = ['PPS'] */);
router.get("/dehydrator-units", getDehydratorUnits /* #swagger.tags = ['PPS'] */);

// Bulk Resource Creation
router.post("/molds/bulk", bulkCreateMolds /* #swagger.tags = ['PPS'] */);
router.post("/dehydrator-trays/bulk", bulkCreateTrays /* #swagger.tags = ['PPS'] */);
router.post("/dehydrator-units/bulk", bulkCreateDehydratorUnits /* #swagger.tags = ['PPS'] */);

// Stage 3 - Demolding
router.get("/stage-3/cook-items", getStage3CookItems /* #swagger.tags = ['PPS'] */);
router.post("/stage-3/remove-tray", removeTray /* #swagger.tags = ['PPS'] */);
router.post("/stage-3/complete", completeStage3 /* #swagger.tags = ['PPS'] */);

// Stage 4 - Packaging & Casing
router.post("/stage-4/scan-container", scanContainer /* #swagger.tags = ['PPS'] */);
router.post("/stage-4/confirm-count", confirmCount /* #swagger.tags = ['PPS'] */);

export default router;
