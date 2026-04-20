import { Router } from "express";
import {
  getAllCases,
  getCaseById,
  getCaseByCaseId,
  createCase,
  updateCase,
  updateCaseStatus,
  deleteCase,
} from "../controllers/caseController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  createCaseSchema,
  updateCaseSchema,
  updateCaseStatusSchema,
  getAllCasesQuery,
} from "../validators/caseSchemas";

const router = Router();

router.get("/", validate({ query: getAllCasesQuery }), getAllCases /* #swagger.tags = ['Cases'] */);
router.get("/:id", validate({ params: idParam }), getCaseById /* #swagger.tags = ['Cases'] */);
router.get("/by-case-id/:caseId", getCaseByCaseId /* #swagger.tags = ['Cases'] */);
router.post("/", validate({ body: createCaseSchema }), createCase /* #swagger.tags = ['Cases'] */);
router.put(
  "/:id",
  validate({ params: idParam, body: updateCaseSchema }),
  updateCase /* #swagger.tags = ['Cases'] */
);
router.put(
  "/:id/status",
  validate({ params: idParam, body: updateCaseStatusSchema }),
  updateCaseStatus /* #swagger.tags = ['Cases'] */
);
router.delete("/:id", validate({ params: idParam }), deleteCase /* #swagger.tags = ['Cases'] */);

export default router;
