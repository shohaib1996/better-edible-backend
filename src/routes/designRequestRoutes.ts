import { Router } from "express";
import {
  submitRequest,
  getRequests,
  getMyRequests,
  getRequestById,
  updateStatus,
  uploadFiles,
  uploadCompletedFiles,
  sendFiles,
  postComment,
  requestRevision,
} from "../controllers/designRequestController";
import { uploadAssets } from "../middleware/uploadMiddleware";

const router = Router();

router.post("/", submitRequest);
router.get("/", getRequests);
router.get("/mine", getMyRequests);
router.get("/:id", getRequestById);
router.put("/:id/status", updateStatus);
router.post("/:id/upload-files", uploadAssets.array("files", 10), uploadFiles);
router.post("/:id/completed-files", uploadAssets.array("files", 10), uploadCompletedFiles);
router.post("/:id/send-files", sendFiles);
router.post("/:id/comments", postComment);
router.post("/:id/request-revision", requestRevision);

export default router;
