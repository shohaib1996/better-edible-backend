import { Router } from "express";
import {
  getAllCookItems,
  getCookItemById,
  getCookItemByCookItemId,
  createCookItem,
  updateCookItem,
  updateCookItemStatus,
  deleteCookItem,
} from "../controllers/cookItemController";

const router = Router();

router.get("/", getAllCookItems /* #swagger.tags = ['CookItems'] */);
router.get("/:id", getCookItemById /* #swagger.tags = ['CookItems'] */);
router.get("/by-cook-item-id/:cookItemId", getCookItemByCookItemId /* #swagger.tags = ['CookItems'] */);
router.post("/", createCookItem /* #swagger.tags = ['CookItems'] */);
router.put("/:id", updateCookItem /* #swagger.tags = ['CookItems'] */);
router.put("/:id/status", updateCookItemStatus /* #swagger.tags = ['CookItems'] */);
router.delete("/:id", deleteCookItem /* #swagger.tags = ['CookItems'] */);

export default router;
