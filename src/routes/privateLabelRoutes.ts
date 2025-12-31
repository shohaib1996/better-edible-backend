import { Router } from "express";
import {
  createPrivateLabelOrder,
  getAllPrivateLabels,
  getPrivateLabelById,
  updatePrivateLabel,
  changePrivateLabelStatus,
  deletePrivateLabel,
} from "../controllers/privateLabelController";
import { uploadPrivateLabelImages } from "../middleware/uploadMiddleware";

const router = Router();

router.post("/", uploadPrivateLabelImages, createPrivateLabelOrder);
router.get("/", getAllPrivateLabels);
router.get("/:id", getPrivateLabelById);
router.put("/:id", uploadPrivateLabelImages, updatePrivateLabel);
router.put("/:id/status", changePrivateLabelStatus);
router.delete("/:id", deletePrivateLabel);

export default router;
