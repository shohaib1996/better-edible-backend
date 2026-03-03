import { Case } from "../models/Case";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// ─────────────────────────────
// Get All Cases
// ─────────────────────────────

export const getAllCases = asyncHandler(async (req, res) => {
  const {
    status,
    cookItemId,
    orderId,
    page = 1,
    limit = 20,
  } = req.query;

  const query: any = {};
  if (status) query.status = status;
  if (cookItemId) query.cookItemId = cookItemId;
  if (orderId) query.orderId = orderId;

  const skip = (Number(page) - 1) * Number(limit);

  const [cases, total] = await Promise.all([
    Case.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Case.countDocuments(query),
  ]);

  res.json({ total, page: Number(page), limit: Number(limit), cases });
});

// ─────────────────────────────
// Get Case by ID
// ─────────────────────────────

export const getCaseById = asyncHandler(async (req, res) => {
  const caseDoc = await Case.findById(req.params.id);
  if (!caseDoc) throw new AppError("Case not found", 404);
  res.json(caseDoc);
});

// ─────────────────────────────
// Get Case by caseId
// ─────────────────────────────

export const getCaseByCaseId = asyncHandler(async (req, res) => {
  const caseDoc = await Case.findOne({ caseId: req.params.caseId });
  if (!caseDoc) throw new AppError("Case not found", 404);
  res.json(caseDoc);
});

// ─────────────────────────────
// Create Case
// ─────────────────────────────

export const createCase = asyncHandler(async (req, res) => {
  const { caseId } = req.body;

  const existing = await Case.findOne({ caseId });
  if (existing) throw new AppError("Case with this ID already exists", 400);

  const caseDoc = await Case.create(req.body);
  res.status(201).json({ message: "Case created successfully", case: caseDoc });
});

// ─────────────────────────────
// Update Case
// ─────────────────────────────

export const updateCase = asyncHandler(async (req, res) => {
  const caseDoc = await Case.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  if (!caseDoc) throw new AppError("Case not found", 404);

  res.json({ message: "Case updated successfully", case: caseDoc });
});

// ─────────────────────────────
// Update Case Status
// ─────────────────────────────

export const updateCaseStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new AppError("Status is required", 400);

  const caseDoc = await Case.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  if (!caseDoc) throw new AppError("Case not found", 404);

  res.json({ message: `Case moved to ${status}`, case: caseDoc });
});

// ─────────────────────────────
// Delete Case
// ─────────────────────────────

export const deleteCase = asyncHandler(async (req, res) => {
  const caseDoc = await Case.findByIdAndDelete(req.params.id);
  if (!caseDoc) throw new AppError("Case not found", 404);
  res.json({ message: "Case deleted successfully" });
});
