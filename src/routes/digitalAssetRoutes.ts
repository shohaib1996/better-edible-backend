import { Router } from "express";
import {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
} from "../controllers/digitalAssetController";
import { uploadAssets } from "../middleware/uploadMiddleware";

const router = Router();

router.get("/", getAssets /* #swagger.tags = ['DigitalAssets'] */);
router.get("/:id", getAssetById /* #swagger.tags = ['DigitalAssets'] */);
router.post("/", uploadAssets.single("file"), createAsset /* #swagger.tags = ['DigitalAssets'] */);
router.put("/:id", updateAsset /* #swagger.tags = ['DigitalAssets'] */);
router.delete("/:id", deleteAsset /* #swagger.tags = ['DigitalAssets'] */);

export default router;
