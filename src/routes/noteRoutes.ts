// src/routes/noteRoutes.ts
import { Router } from 'express';
import {
  createNote,
  getAllNotes,
  getNoteById,
  deleteNote,
} from '../controllers/noteController';

const router = Router();

router.post('/', createNote);
router.get('/', getAllNotes);
router.get('/:id', getNoteById);
router.delete('/:id', deleteNote);

export default router;
