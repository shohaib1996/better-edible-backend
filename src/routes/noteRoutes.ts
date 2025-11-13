// src/routes/noteRoutes.ts
import { Router } from "express";
import {
  createNote,
  getAllNotes,
  getNoteById,
  updateNote,
  deleteNote,
} from "../controllers/noteController";

const router = Router();

router.post("/", createNote);
router.get("/", getAllNotes);
router.get("/:id", getNoteById);
router.put("/:id", updateNote);    // <-- edit note endpoint
router.delete("/:id", deleteNote);

export default router;
