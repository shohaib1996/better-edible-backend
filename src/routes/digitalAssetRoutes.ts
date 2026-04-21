import { Router } from "express";
import {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
} from "../controllers/digitalAssetController";
import { upload } from "../middleware/uploadMiddleware";

const router = Router();

router.get("/", getAssets);
router.get("/:id", getAssetById);
router.post("/", upload.single("file"), createAsset);
router.put("/:id", updateAsset);
router.delete("/:id", deleteAsset);

export default router;
