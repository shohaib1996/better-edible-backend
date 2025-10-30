// src/controllers/noteController.ts
import { Request, Response } from "express";
import { Note } from "../models/Note";

// 🟩 Create a note
export const createNote = async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, author, text } = req.body;

    if (!entityType || !entityId || !text)
      return res.status(400).json({ message: "Missing required fields" });

    const note = await Note.create({ entityType, entityId, author, text });
    res.status(201).json({ message: "Note added successfully", note });
  } catch (error) {
    res.status(500).json({ message: "Error creating note", error });
  }
};

// 🟨 Get all notes (with filters)
export const getAllNotes = async (req: Request, res: Response) => {
  console.log(req.query);
  try {
    const { entityId, page = 1, limit = 20 } = req.query;

    if (!entityId) {
      return res
        .status(400)
        .json({ message: "entityId (store id) is required" });
    }

    const pageNum = Math.max(+page || 1, 1);
    const limitNum = Math.min(Math.max(+limit || 20, 1), 100);

    const query = { entityId };

    const notes = await Note.find(query)
      .populate("entityId", "name address city state")
      .sort({ createdAt: -1 })
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
    const note = await Note.findById(req.params.id).populate("author", "name");
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: "Error fetching note", error });
  }
};

// 🟧 Delete a note
export const deleteNote = async (req: Request, res: Response) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting note", error });
  }
};
