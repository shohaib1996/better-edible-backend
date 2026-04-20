import { Router } from "express";
import {
  getContainers,
  getContainerById,
  createContainer,
  refillContainer,
  cleanContainer,
  calculatePull,
  recordDrawdown,
  getWasteLogs,
  createWasteLog,
} from "../controllers/oilController";
import { validate } from "../middleware/validate";
import {
  createContainerSchema,
  refillContainerSchema,
  cleanContainerSchema,
  calculatePullSchema,
  drawdownSchema,
  createWasteLogSchema,
  getContainersQuery,
  getWasteLogsQuery,
} from "../validators/oilSchemas";

const router = Router();

// Containers
router.get(
  "/containers",
  validate({ query: getContainersQuery }),
  getContainers /* #swagger.tags = ['Oil'] */
);
router.get("/containers/:containerId", getContainerById /* #swagger.tags = ['Oil'] */);
router.post(
  "/containers",
  validate({ body: createContainerSchema }),
  createContainer /* #swagger.tags = ['Oil'] */
);
router.patch(
  "/containers/:containerId/refill",
  validate({ body: refillContainerSchema }),
  refillContainer /* #swagger.tags = ['Oil'] */
);
router.patch(
  "/containers/:containerId/clean",
  validate({ body: cleanContainerSchema }),
  cleanContainer /* #swagger.tags = ['Oil'] */
);
router.get(
  "/containers/:containerId/calculate",
  validate({ query: calculatePullSchema }),
  calculatePull /* #swagger.tags = ['Oil'] */
);
router.post(
  "/containers/:containerId/drawdown",
  validate({ body: drawdownSchema }),
  recordDrawdown /* #swagger.tags = ['Oil'] */
);

// Waste logs
router.get(
  "/waste-logs",
  validate({ query: getWasteLogsQuery }),
  getWasteLogs /* #swagger.tags = ['Oil'] */
);
router.post(
  "/waste-logs",
  validate({ body: createWasteLogSchema }),
  createWasteLog /* #swagger.tags = ['Oil'] */
);

export default router;
