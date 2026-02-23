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

const router = Router();

router.get("/", getAllCases /* #swagger.tags = ['Cases'] */);
router.get("/:id", getCaseById /* #swagger.tags = ['Cases'] */);
router.get("/by-case-id/:caseId", getCaseByCaseId /* #swagger.tags = ['Cases'] */);
router.post("/", createCase /* #swagger.tags = ['Cases'] */);
router.put("/:id", updateCase /* #swagger.tags = ['Cases'] */);
router.put("/:id/status", updateCaseStatus /* #swagger.tags = ['Cases'] */);
router.delete("/:id", deleteCase /* #swagger.tags = ['Cases'] */);

export default router;
