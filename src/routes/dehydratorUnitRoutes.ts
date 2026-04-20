import { Router } from "express";
import {
  getAllDehydratorUnits,
  getDehydratorUnitById,
  getDehydratorUnitByUnitId,
  createDehydratorUnit,
  updateDehydratorUnit,
  updateShelf,
  deleteDehydratorUnit,
} from "../controllers/dehydratorUnitController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  createDehydratorUnitSchema,
  updateDehydratorUnitSchema,
  updateShelfSchema,
  getAllDehydratorUnitsQuery,
} from "../validators/dehydratorUnitSchemas";

const router = Router();

router.get(
  "/",
  validate({ query: getAllDehydratorUnitsQuery }),
  getAllDehydratorUnits /* #swagger.tags = ['DehydratorUnits'] */
);
router.get(
  "/:id",
  validate({ params: idParam }),
  getDehydratorUnitById /* #swagger.tags = ['DehydratorUnits'] */
);
router.get(
  "/by-unit-id/:unitId",
  getDehydratorUnitByUnitId /* #swagger.tags = ['DehydratorUnits'] */
);
router.post(
  "/",
  validate({ body: createDehydratorUnitSchema }),
  createDehydratorUnit /* #swagger.tags = ['DehydratorUnits'] */
);
router.put(
  "/:id",
  validate({ params: idParam, body: updateDehydratorUnitSchema }),
  updateDehydratorUnit /* #swagger.tags = ['DehydratorUnits'] */
);
router.put(
  "/:id/shelf/:shelfPosition",
  validate({ params: idParam, body: updateShelfSchema }),
  updateShelf /* #swagger.tags = ['DehydratorUnits'] */
);
router.delete(
  "/:id",
  validate({ params: idParam }),
  deleteDehydratorUnit /* #swagger.tags = ['DehydratorUnits'] */
);

export default router;
