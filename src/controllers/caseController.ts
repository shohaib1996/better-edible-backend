import { Request, Response } from "express";
import { Case } from "../models/Case";

// ─────────────────────────────
// Get All Cases
// ─────────────────────────────

export const getAllCases = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Error fetching cases", error });
  }
};

// ─────────────────────────────
// Get Case by ID
// ─────────────────────────────

export const getCaseById = async (req: Request, res: Response) => {
  try {
    const caseDoc = await Case.findById(req.params.id);
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });

    res.json(caseDoc);
  } catch (error) {
    res.status(500).json({ message: "Error fetching case", error });
  }
};

// ─────────────────────────────
// Get Case by caseId
// ─────────────────────────────

export const getCaseByCaseId = async (req: Request, res: Response) => {
  try {
    const caseDoc = await Case.findOne({ caseId: req.params.caseId });
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });

    res.json(caseDoc);
  } catch (error) {
    res.status(500).json({ message: "Error fetching case", error });
  }
};

// ─────────────────────────────
// Create Case
// ─────────────────────────────

export const createCase = async (req: Request, res: Response) => {
  try {
    const { caseId } = req.body;

    const existing = await Case.findOne({ caseId });
    if (existing) {
      return res.status(400).json({ message: "Case with this ID already exists" });
    }

    const caseDoc = await Case.create(req.body);
    res.status(201).json({ message: "Case created successfully", case: caseDoc });
  } catch (error) {
    res.status(500).json({ message: "Error creating case", error });
  }
};

// ─────────────────────────────
// Update Case
// ─────────────────────────────

export const updateCase = async (req: Request, res: Response) => {
  try {
    const caseDoc = await Case.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!caseDoc) return res.status(404).json({ message: "Case not found" });

    res.json({ message: "Case updated successfully", case: caseDoc });
  } catch (error) {
    res.status(500).json({ message: "Error updating case", error });
  }
};

// ─────────────────────────────
// Update Case Status
// ─────────────────────────────

export const updateCaseStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });

    const caseDoc = await Case.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!caseDoc) return res.status(404).json({ message: "Case not found" });

    res.json({ message: `Case moved to ${status}`, case: caseDoc });
  } catch (error) {
    res.status(500).json({ message: "Error updating case status", error });
  }
};

// ─────────────────────────────
// Delete Case
// ─────────────────────────────

export const deleteCase = async (req: Request, res: Response) => {
  try {
    const caseDoc = await Case.findByIdAndDelete(req.params.id);
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });

    res.json({ message: "Case deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting case", error });
  }
};
