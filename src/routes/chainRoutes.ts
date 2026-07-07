import { Router } from "express";
import {
  getAllChains,
  getChainById,
  getChainRollup,
  updateChainStores,
  updateChainCredentials,
  assignStoreToChain,
  createChain,
  updateChain,
  deleteChain,
} from "../controllers/chainController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import { createChainSchema, updateChainSchema } from "../validators/chainSchemas";
import { z } from "zod";

const storeIdsSchema = z.object({
  storeIds: z.array(z.string()).default([]),
});

const router = Router();

router.get("/", getAllChains /* #swagger.tags = ['Chains'] */);
router.get("/:id/rollup", validate({ params: idParam }), getChainRollup /* #swagger.tags = ['Chains'] */);
router.get("/:id", validate({ params: idParam }), getChainById /* #swagger.tags = ['Chains'] */);
router.post("/", validate({ body: createChainSchema }), createChain /* #swagger.tags = ['Chains'] */);
router.put("/assign-store", assignStoreToChain /* #swagger.tags = ['Chains'] */);
router.put("/:id/stores", validate({ params: idParam, body: storeIdsSchema }), updateChainStores /* #swagger.tags = ['Chains'] */);
router.put("/:id/credentials", validate({ params: idParam }), updateChainCredentials /* #swagger.tags = ['Chains'] */);
router.put("/:id", validate({ params: idParam, body: updateChainSchema }), updateChain /* #swagger.tags = ['Chains'] */);
router.delete("/:id", validate({ params: idParam }), deleteChain /* #swagger.tags = ['Chains'] */);

export default router;
