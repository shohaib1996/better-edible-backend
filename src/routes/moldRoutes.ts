import { Router } from "express";
import {
  getAllMolds,
  getMoldById,
  getMoldByMoldId,
  createMold,
  updateMold,
  deleteMold,
} from "../controllers/pps/moldController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import { createMoldSchema, updateMoldSchema, getAllMoldsQuery } from "../validators/moldSchemas";

const router = Router();

router.get("/", validate({ query: getAllMoldsQuery }), getAllMolds /* #swagger.tags = ['Molds'] */);
router.get("/:id", validate({ params: idParam }), getMoldById /* #swagger.tags = ['Molds'] */);
router.get("/by-mold-id/:moldId", getMoldByMoldId /* #swagger.tags = ['Molds'] */);
router.post("/", validate({ body: createMoldSchema }), createMold /* #swagger.tags = ['Molds'] */);
router.put(
  "/:id",
  validate({ params: idParam, body: updateMoldSchema }),
  updateMold /* #swagger.tags = ['Molds'] */
);
router.delete("/:id", validate({ params: idParam }), deleteMold /* #swagger.tags = ['Molds'] */);

export default router;
