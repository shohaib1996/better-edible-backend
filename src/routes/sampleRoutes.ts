import { Router } from "express";
import {
  createSample,
  getAllSamples,
  getSampleById,
  updateSample,
  updateSampleStatus,
  deleteSample,
} from "../controllers/sampleController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  createSampleSchema,
  updateSampleStatusSchema,
  getAllSamplesQuery,
} from "../validators/sampleSchemas";

const router = Router();

router.post(
  "/",
  validate({ body: createSampleSchema }),
  createSample /* #swagger.tags = ['Samples'] */
);
router.get(
  "/",
  validate({ query: getAllSamplesQuery }),
  getAllSamples /* #swagger.tags = ['Samples'] */
);
router.get("/:id", validate({ params: idParam }), getSampleById /* #swagger.tags = ['Samples'] */);
router.put("/:id", validate({ params: idParam }), updateSample /* #swagger.tags = ['Samples'] */);
router.put(
  "/:id/status",
  validate({ params: idParam, body: updateSampleStatusSchema }),
  updateSampleStatus /* #swagger.tags = ['Samples'] */
);
router.delete(
  "/:id",
  validate({ params: idParam }),
  deleteSample /* #swagger.tags = ['Samples'] */
);

export default router;
