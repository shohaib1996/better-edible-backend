import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import {
  DesignRequest,
  DesignRequestQueue,
  DesignRequestSource,
  DesignRequestType,
} from "../models/DesignRequest";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import { cleanupTempFiles } from "../middleware/uploadMiddleware";
// Auto-generate requestId: DR10001, DR10002, ...
async function generateRequestId(): Promise<string> {
  // Use a simple find-based counter on the collection itself
  const count = await DesignRequest.countDocuments();
  const next = 10001 + count;
  // Ensure uniqueness in case of race: keep incrementing if taken
  let requestId = `DR${next}`;
  let exists = await DesignRequest.exists({ requestId });
  let offset = 1;
  while (exists) {
    requestId = `DR${next + offset}`;
    exists = await DesignRequest.exists({ requestId });
    offset++;
  }
  return requestId;
}

function deriveQueue(
  source: DesignRequestSource,
  requestType: DesignRequestType
): DesignRequestQueue {
  if (source === "admin" || source === "rep") return "inhouse";
  return requestType === "free" ? "free" : "paid";
}

// POST /api/design-requests
export const submitRequest = asyncHandler(async (req, res) => {
  const {
    requestType,
    source,
    storeId,
    storeName,
    contactId,
    submittedBy,
    submittedByName,
    productLine,
    description,
  } = req.body;

  if (!requestType || !source || !description) {
    throw new AppError("requestType, source, and description are required", 400);
  }
  if (requestType === "free" && !productLine) {
    throw new AppError("productLine is required for free requests", 400);
  }

  const queueType = deriveQueue(source, requestType);
  const requestId = await generateRequestId();

  const request = await DesignRequest.create({
    requestId,
    requestType,
    source,
    queueType,
    storeId: storeId || undefined,
    storeName: storeName || undefined,
    contactId: contactId || undefined,
    submittedBy: submittedBy || undefined,
    submittedByName: submittedByName || undefined,
    productLine: productLine || null,
    description,
  });

  res.status(201).json({ success: true, request });
});

// GET /api/design-requests
export const getRequests = asyncHandler(async (req, res) => {
  const { queue, status, storeId, page = "1", limit = "20" } = req.query;

  const filter: Record<string, unknown> = {};
  if (queue) filter.queueType = queue;
  if (status) filter.status = status;
  if (storeId) filter.storeId = storeId;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const [requests, total] = await Promise.all([
    DesignRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    DesignRequest.countDocuments(filter),
  ]);

  res
    .status(200)
    .json({ success: true, requests, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

// GET /api/design-requests/mine
export const getMyRequests = asyncHandler(async (req, res) => {
  const { contactId } = req.query;
  if (!contactId) throw new AppError("contactId is required", 400);

  const requests = await DesignRequest.find({ contactId }).sort({ createdAt: -1 });

  res.status(200).json({ success: true, requests });
});

// GET /api/design-requests/:id
export const getRequestById = asyncHandler(async (req, res) => {
  const request = await DesignRequest.findById(req.params.id);
  if (!request) throw new AppError("Design request not found", 404);

  res.status(200).json({ success: true, request });
});

// PUT /api/design-requests/:id/status
export const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["pending", "in-progress", "revision-requested", "completed"];
  if (!status || !validStatuses.includes(status)) {
    throw new AppError(`status must be one of: ${validStatuses.join(", ")}`, 400);
  }

  const request = await DesignRequest.findById(req.params.id);
  if (!request) throw new AppError("Design request not found", 404);

  request.status = status;
  await request.save();

  res.status(200).json({ success: true, request });
});

// POST /api/design-requests/:id/upload-files  (store uploads reference files)
export const uploadFiles = asyncHandler(async (req, res) => {
  const request = await DesignRequest.findById(req.params.id);
  if (!request) throw new AppError("Design request not found", 404);

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) throw new AppError("No files provided", 400);

  const uploads = await Promise.all(
    files.map((f) => uploadToCloudinary(f.path, "design-requests/reference", f.originalname))
  );
  cleanupTempFiles(files);

  for (const u of uploads) {
    request.uploadedFiles.push({
      url: u.secureUrl,
      fileName: u.originalFilename,
      uploadedAt: new Date(),
    });
  }
  await request.save();

  res.status(200).json({ success: true, uploadedFiles: request.uploadedFiles });
});

// POST /api/design-requests/:id/completed-files  (designer uploads finished files)
export const uploadCompletedFiles = asyncHandler(async (req, res) => {
  const request = await DesignRequest.findById(req.params.id);
  if (!request) throw new AppError("Design request not found", 404);

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) throw new AppError("No files provided", 400);

  // Version = current max version + 1
  const currentMaxVersion = request.completedFiles.reduce((max, f) => Math.max(max, f.version), 0);
  const nextVersion = currentMaxVersion + 1;

  const uploads = await Promise.all(
    files.map((f) => uploadToCloudinary(f.path, "design-requests/completed", f.originalname))
  );
  cleanupTempFiles(files);

  for (const u of uploads) {
    request.completedFiles.push({
      url: u.secureUrl,
      fileName: u.originalFilename,
      uploadedAt: new Date(),
      sent: false,
      version: nextVersion,
    });
  }
  await request.save();

  res.status(200).json({ success: true, completedFiles: request.completedFiles });
});

// POST /api/design-requests/:id/send-files
export const sendFiles = asyncHandler(async (req, res) => {
  const { fileIds } = req.body; // array of completedFile _id strings
  if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
    throw new AppError("fileIds array is required", 400);
  }

  const request = await DesignRequest.findById(req.params.id);
  if (!request) throw new AppError("Design request not found", 404);

  const now = new Date();
  for (const file of request.completedFiles) {
    if (fileIds.includes(String(file._id))) {
      file.sent = true;
      file.sentAt = now;
    }
  }

  // Auto-complete if all files are sent
  const allSent = request.completedFiles.length > 0 && request.completedFiles.every((f) => f.sent);
  if (allSent && request.status !== "completed") {
    request.status = "completed";
  }

  await request.save();

  res.status(200).json({ success: true, request });
});

// POST /api/design-requests/:id/comments
export const postComment = asyncHandler(async (req, res) => {
  const { authorId, authorName, authorRole, message } = req.body;
  if (!authorId || !authorName || !authorRole || !message) {
    throw new AppError("authorId, authorName, authorRole, and message are required", 400);
  }

  const request = await DesignRequest.findById(req.params.id);
  if (!request) throw new AppError("Design request not found", 404);

  request.comments.push({ authorId, authorName, authorRole, message, createdAt: new Date() });
  await request.save();

  res.status(200).json({ success: true, comments: request.comments });
});

// POST /api/design-requests/:id/request-revision
export const requestRevision = asyncHandler(async (req, res) => {
  const { authorId, authorName, message } = req.body;
  if (!authorId || !authorName || !message) {
    throw new AppError("authorId, authorName, and message are required", 400);
  }

  const request = await DesignRequest.findById(req.params.id);
  if (!request) throw new AppError("Design request not found", 404);

  const allowedStatuses = ["completed", "in-progress"];
  if (!allowedStatuses.includes(request.status)) {
    throw new AppError(
      "Revision can only be requested when status is completed or in-progress",
      400
    );
  }

  request.revisionCount += 1;
  request.status = "revision-requested";
  request.comments.push({
    authorId,
    authorName,
    authorRole: "store",
    message: `Store requested changes: ${message}`,
    createdAt: new Date(),
  });

  await request.save();

  res.status(200).json({ success: true, request });
});
