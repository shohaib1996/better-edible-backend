import { Router } from "express";
import {
  getActiveLabelOrders,
  createLabelOrder,
  bulkCreateLabelOrders,
  receiveLabelOrder,
  updateLabelOrder,
  deleteLabelOrder,
  getLabelInventory,
  applyLabels,
  printLabels,
  getInventorySummary,
  setReorderThreshold,
} from "../controllers/pps/packagePrepController";
import { validate } from "../middleware/validate";
import {
  createLabelOrderSchema,
  bulkCreateLabelOrdersSchema,
  receiveLabelOrderSchema,
  updateLabelOrderSchema,
  applyLabelsSchema,
  printLabelsSchema,
  setReorderThresholdSchema,
  getLabelInventoryQuerySchema,
} from "../validators/packagePrepSchemas";

const router = Router();

// Orders
router.get("/package-prep/orders", getActiveLabelOrders /* #swagger.tags = ['PackagePrep'] */);
router.post(
  "/package-prep/orders/bulk",
  validate({ body: bulkCreateLabelOrdersSchema }),
  bulkCreateLabelOrders /* #swagger.tags = ['PackagePrep'] */
);
router.post("/package-prep/orders", validate({ body: createLabelOrderSchema }), createLabelOrder /* #swagger.tags = ['PackagePrep'] */);
router.post(
  "/package-prep/orders/:orderId/receive",
  validate({ body: receiveLabelOrderSchema }),
  receiveLabelOrder /* #swagger.tags = ['PackagePrep'] */
);
router.patch(
  "/package-prep/orders/:orderId",
  validate({ body: updateLabelOrderSchema }),
  updateLabelOrder /* #swagger.tags = ['PackagePrep'] */
);
router.delete("/package-prep/orders/:orderId", deleteLabelOrder /* #swagger.tags = ['PackagePrep'] */);

// Inventory
router.get("/package-prep/inventory/summary", getInventorySummary /* #swagger.tags = ['PackagePrep'] */);
router.get(
  "/package-prep/inventory",
  validate({ query: getLabelInventoryQuerySchema }),
  getLabelInventory /* #swagger.tags = ['PackagePrep'] */
);
router.post("/package-prep/inventory/apply", validate({ body: applyLabelsSchema }), applyLabels /* #swagger.tags = ['PackagePrep'] */);
router.post("/package-prep/inventory/print", validate({ body: printLabelsSchema }), printLabels /* #swagger.tags = ['PackagePrep'] */);
router.patch(
  "/package-prep/inventory/:inventoryId/threshold",
  validate({ body: setReorderThresholdSchema }),
  setReorderThreshold /* #swagger.tags = ['PackagePrep'] */
);

export default router;
