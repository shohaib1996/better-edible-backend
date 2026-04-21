import { Router } from "express";
import {
  getAllDehydratorTrays,
  getDehydratorTrayById,
  getDehydratorTrayByTrayId,
  createDehydratorTray,
  updateDehydratorTray,
  deleteDehydratorTray,
} from "../controllers/pps/dehydratorTrayController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  createDehydratorTraySchema,
  updateDehydratorTraySchema,
  getAllDehydratorTraysQuery,
} from "../validators/dehydratorTraySchemas";

const router = Router();

router.get(
  "/",
  validate({ query: getAllDehydratorTraysQuery }),
  getAllDehydratorTrays /* #swagger.tags = ['DehydratorTrays'] */
);
router.get(
  "/:id",
  validate({ params: idParam }),
  getDehydratorTrayById /* #swagger.tags = ['DehydratorTrays'] */
);
router.get(
  "/by-tray-id/:trayId",
  getDehydratorTrayByTrayId /* #swagger.tags = ['DehydratorTrays'] */
);
router.post(
  "/",
  validate({ body: createDehydratorTraySchema }),
  createDehydratorTray /* #swagger.tags = ['DehydratorTrays'] */
);
router.put(
  "/:id",
  validate({ params: idParam, body: updateDehydratorTraySchema }),
  updateDehydratorTray /* #swagger.tags = ['DehydratorTrays'] */
);
router.delete(
  "/:id",
  validate({ params: idParam }),
  deleteDehydratorTray /* #swagger.tags = ['DehydratorTrays'] */
);

export default router;
