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

router.post("/", submitRequest /* #swagger.tags = ['DesignRequests'] */);
router.get("/", getRequests /* #swagger.tags = ['DesignRequests'] */);
router.get("/mine", getMyRequests /* #swagger.tags = ['DesignRequests'] */);
router.get("/:id", getRequestById /* #swagger.tags = ['DesignRequests'] */);
router.put("/:id/status", updateStatus /* #swagger.tags = ['DesignRequests'] */);
router.post("/:id/upload-files", uploadAssets.array("files", 10), uploadFiles /* #swagger.tags = ['DesignRequests'] */);
router.post("/:id/completed-files", uploadAssets.array("files", 10), uploadCompletedFiles /* #swagger.tags = ['DesignRequests'] */);
router.post("/:id/send-files", sendFiles /* #swagger.tags = ['DesignRequests'] */);
router.post("/:id/comments", postComment /* #swagger.tags = ['DesignRequests'] */);
router.post("/:id/request-revision", requestRevision /* #swagger.tags = ['DesignRequests'] */);

export default router;
