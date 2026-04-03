// src/controllers/noteController.ts
import { Note } from "../models/Note";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// 🟩 Create a note
export const createNote = asyncHandler(async (req, res) => {
  const {
    entityId,
    author,
    disposition,
    visitType,
    content,
    sample,
    delivery,
    payment,
    date,
  } = req.body;

  if (!entityId || !author || !content) {
    throw new AppError("entityId, author, and content are required", 400);
  }

  if (!date) {
    throw new AppError("date is required (format: YYYY-MM-DD HH:MM)", 400);
  }

  const note = await Note.create({
    entityId,
    author,
    disposition,
    visitType,
    content,
    sample,
    delivery,
    payment,
    date,
  });

  res.status(201).json({
    success: true,
    message: "Note created successfully",
    note,
  });
});

// 🟨 Get all notes
export const getAllNotes = asyncHandler(async (req, res) => {
  const { entityId, repId, date, page = 1, limit = 20 } = req.query;

  const query: any = {};

  if (entityId) {
    query.entityId = entityId;
  }

  if (repId) {
    query.author = repId;
  }

  if (date) {
    // Date can be either "YYYY-MM-DD" or "YYYY-MM-DD HH:MM"
    // If only date is provided (10 chars), match any time on that date
    // If full datetime is provided, match exactly
    const dateStr = date as string;
    if (dateStr.length === 10) {
      // Match any note that starts with "YYYY-MM-DD"
      query.date = { $regex: `^${dateStr}` };
    } else {
      // Exact match for full datetime
      query.date = dateStr;
    }
  }

  // Ensure at least one filter is provided to prevent fetching all notes blindly
  if (Object.keys(query).length === 0) {
    throw new AppError(
      "At least one filter (entityId, repId, or date) is required",
      400,
    );
  }

  const pageNum = Math.max(+page || 1, 1);
  const limitNum = Math.min(Math.max(+limit || 20, 1), 100);

  const notes = await Note.find(query)
    .populate("author", "name role email")
    .populate("entityId", "name address") // Optional: populate store info if listing
    .sort({ date: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const total = await Note.countDocuments(query);

  const sanitized = notes.map((n) => {
    const obj = n.toObject();
    if (!(obj as any).author) (obj as any).author = { name: "Unknown Author" };
    return obj;
  });

  res.status(200).json({
    success: true,
    total,
    page: pageNum,
    limit: limitNum,
    count: sanitized.length,
    notes: sanitized,
  });
});

// 🟦 Get a single note
export const getNoteById = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id).populate(
    "author",
    "name email role",
  );

  if (!note) throw new AppError("Note not found", 404);

  const obj = note.toObject();
  if (!(obj as any).author) (obj as any).author = { name: "Unknown Author" };

  res.json({ success: true, note: obj });
});

// 🟩 Update a note (edit)
export const updateNote = asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  if (!noteId) throw new AppError("Note id is required", 400);

  // Only allow updating these fields (do not allow changing entityId or author)
  const { disposition, visitType, content, sample, delivery, payment, date } =
    req.body;

  // Validate date format if provided
  if (date && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(date)) {
    throw new AppError("Invalid date format. Use YYYY-MM-DD HH:MM", 400);
  }

  const updates: any = {};

  if (disposition !== undefined) updates.disposition = disposition;
  if (visitType !== undefined) updates.visitType = visitType;
  if (content !== undefined) updates.content = content;
  if (sample !== undefined) updates.sample = sample;
  if (delivery !== undefined) updates.delivery = delivery;
  if (payment !== undefined) updates.payment = payment;
  if (date !== undefined) updates.date = date;

  // If no updatable fields present
  if (Object.keys(updates).length === 0) {
    throw new AppError("No valid fields provided for update", 400);
  }

  const updatedNote = await Note.findByIdAndUpdate(noteId, updates, {
    new: true,
    runValidators: true,
  }).populate("author", "name email role");

  if (!updatedNote) throw new AppError("Note not found", 404);

  const obj = updatedNote.toObject();
  if (!(obj as any).author) (obj as any).author = { name: "Unknown Author" };

  res.status(200).json({
    success: true,
    message: "Note updated successfully",
    note: obj,
  });
});

// 🟧 Delete a note
export const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findByIdAndDelete(req.params.id);
  if (!note) throw new AppError("Note not found", 404);

  res.json({
    success: true,
    message: "Note deleted successfully",
  });
});
