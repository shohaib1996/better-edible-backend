// src/controllers/noteController.ts
import { Request, Response } from "express";
import { Note } from "../models/Note";

// 🟩 Create a note
export const createNote = async (req: Request, res: Response) => {
  try {
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
      return res.status(400).json({
        message: "entityId, author, and content are required",
      });
    }

    if (!date) {
      return res.status(400).json({
        message: "date is required (format: YYYY-MM-DD HH:MM)",
      });
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
  } catch (error: any) {
    console.error("Error creating note:", error);
    res.status(500).json({
      success: false,
      message: "Error creating note",
      error: error.message || error,
    });
  }
};

// 🟨 Get all notes
export const getAllNotes = async (req: Request, res: Response) => {
  try {
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
      return res.status(400).json({
        message: "At least one filter (entityId, repId, or date) is required",
      });
    }

    const pageNum = Math.max(+page || 1, 1);
    const limitNum = Math.min(Math.max(+limit || 20, 1), 100);

    const notes = await Note.find(query)
      .populate("author", "name role email")
      .populate("entityId", "name address") // Optional: populate store info if listing across stores
      .sort({ date: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Note.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      count: notes.length,
      notes,
    });
  } catch (error: any) {
    console.error("Error fetching notes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notes",
      error: error.message || error,
    });
  }
};

// 🟦 Get a single note
export const getNoteById = async (req: Request, res: Response) => {
  try {
    const note = await Note.findById(req.params.id).populate(
      "author",
      "name email role"
    );

    if (!note) return res.status(404).json({ message: "Note not found" });

    res.json({ success: true, note });
  } catch (error: any) {
    console.error("Error fetching note:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching note",
      error: error.message || error,
    });
  }
};

// 🟩 Update a note (edit)
export const updateNote = async (req: Request, res: Response) => {
  try {
    const noteId = req.params.id;
    if (!noteId) {
      return res.status(400).json({ message: "Note id is required" });
    }

    // Only allow updating these fields (do not allow changing entityId or author)
    const { disposition, visitType, content, sample, delivery, payment, date } =
      req.body;

    // Validate date format if provided
    if (date && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(date)) {
      return res.status(400).json({
        message: "Invalid date format. Use YYYY-MM-DD HH:MM",
      });
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
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    const updatedNote = await Note.findByIdAndUpdate(noteId, updates, {
      new: true,
      runValidators: true,
    }).populate("author", "name email role");

    if (!updatedNote) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.status(200).json({
      success: true,
      message: "Note updated successfully",
      note: updatedNote,
    });
  } catch (error: any) {
    console.error("Error updating note:", error);
    res.status(500).json({
      success: false,
      message: "Error updating note",
      error: error.message || error,
    });
  }
};

// 🟧 Delete a note
export const deleteNote = async (req: Request, res: Response) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    res.json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting note:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting note",
      error: error.message || error,
    });
  }
};
