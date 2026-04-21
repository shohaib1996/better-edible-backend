import { Router } from "express";
import {
  getAllCookItems,
  getCookItemById,
  getCookItemByCookItemId,
  createCookItem,
  updateCookItem,
  updateCookItemStatus,
  deleteCookItem,
} from "../controllers/pps/cookItemController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  createCookItemSchema,
  updateCookItemStatusSchema,
  getAllCookItemsQuery,
} from "../validators/cookItemSchemas";

const router = Router();

router.get(
  "/",
  validate({ query: getAllCookItemsQuery }),
  getAllCookItems /* #swagger.tags = ['CookItems'] */
);
router.get(
  "/:id",
  validate({ params: idParam }),
  getCookItemById /* #swagger.tags = ['CookItems'] */
);
router.get(
  "/by-cook-item-id/:cookItemId",
  getCookItemByCookItemId /* #swagger.tags = ['CookItems'] */
);
router.post(
  "/",
  validate({ body: createCookItemSchema }),
  createCookItem /* #swagger.tags = ['CookItems'] */
);
router.put(
  "/:id",
  validate({ params: idParam }),
  updateCookItem /* #swagger.tags = ['CookItems'] */
);
router.put(
  "/:id/status",
  validate({ params: idParam, body: updateCookItemStatusSchema }),
  updateCookItemStatus /* #swagger.tags = ['CookItems'] */
);
router.delete(
  "/:id",
  validate({ params: idParam }),
  deleteCookItem /* #swagger.tags = ['CookItems'] */
);

export default router;
