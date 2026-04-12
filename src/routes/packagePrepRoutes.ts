import { Router } from "express";
import {
  getActiveLabelOrders,
  createLabelOrder,
  bulkCreateLabelOrders,
  receiveLabelOrder,
  getLabelInventory,
  applyLabels,
  printLabels,
  getInventorySummary,
  setReorderThreshold,
} from "../controllers/packagePrepController";
import { validate } from "../middleware/validate";
import {
  createLabelOrderSchema,
  bulkCreateLabelOrdersSchema,
  receiveLabelOrderSchema,
  applyLabelsSchema,
  printLabelsSchema,
  setReorderThresholdSchema,
  getLabelInventoryQuerySchema,
} from "../validators/packagePrepSchemas";

const router = Router();

// Orders
router.get("/package-prep/orders", getActiveLabelOrders);
router.post(
  "/package-prep/orders/bulk",
  validate({ body: bulkCreateLabelOrdersSchema }),
  bulkCreateLabelOrders
);
router.post(
  "/package-prep/orders",
  validate({ body: createLabelOrderSchema }),
  createLabelOrder
);
router.post(
  "/package-prep/orders/:orderId/receive",
  validate({ body: receiveLabelOrderSchema }),
  receiveLabelOrder
);

// Inventory
router.get(
  "/package-prep/inventory/summary",
  getInventorySummary
);
router.get(
  "/package-prep/inventory",
  validate({ query: getLabelInventoryQuerySchema }),
  getLabelInventory
);
router.post(
  "/package-prep/inventory/apply",
  validate({ body: applyLabelsSchema }),
  applyLabels
);
router.post(
  "/package-prep/inventory/print",
  validate({ body: printLabelsSchema }),
  printLabels
);
router.patch(
  "/package-prep/inventory/:inventoryId/threshold",
  validate({ body: setReorderThresholdSchema }),
  setReorderThreshold
);

export default router;
