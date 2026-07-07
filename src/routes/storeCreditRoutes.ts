import { Router } from "express";
import { getCreditBalance, applyCredit, addCredit, getStoreCreditLedger } from "../controllers/storeCreditController";

const router = Router();

router.get("/", getCreditBalance /* #swagger.tags = ['Store - Credit'] */);
router.get("/:storeId/ledger", getStoreCreditLedger /* #swagger.tags = ['Store - Credit'] */);
router.post("/:storeId/apply", applyCredit /* #swagger.tags = ['Store - Credit'] */);
router.post("/:storeId/add", addCredit /* #swagger.tags = ['Store - Credit'] */);

export default router;
