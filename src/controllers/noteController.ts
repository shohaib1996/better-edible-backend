// src/controllers/noteController.ts
import { Request, Response } from 'express';
import { Note } from '../models/Note';

// 🟩 Create a note
export const createNote = async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, author, text } = req.body;

    if (!entityType || !entityId || !text)
      return res.status(400).json({ message: 'Missing required fields' });

    const note = await Note.create({ entityType, entityId, author, text });
    res.status(201).json({ message: 'Note added successfully', note });
  } catch (error) {
    res.status(500).json({ message: 'Error creating note', error });
  }
};

// 🟨 Get all notes (with filters)
export const getAllNotes = async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, page = 1, limit = 20 } = req.query;
    const query: any = {};

    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;

    const notes = await Note.find(query)
      .populate('author', 'name repType')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await Note.countDocuments(query);
    res.json({ total, page: +page, limit: +limit, notes });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notes', error });
  }
};

// 🟦 Get a single note
export const getNoteById = async (req: Request, res: Response) => {
  try {
    const note = await Note.findById(req.params.id).populate('author', 'name');
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching note', error });
  }
};

// 🟧 Delete a note
export const deleteNote = async (req: Request, res: Response) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting note', error });
  }
};
