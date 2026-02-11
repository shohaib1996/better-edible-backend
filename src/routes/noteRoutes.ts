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

router.post("/", createNote /* #swagger.tags = ['Notes'] */);
router.get("/", getAllNotes /* #swagger.tags = ['Notes'] */);
router.get("/:id", getNoteById /* #swagger.tags = ['Notes'] */);
router.put("/:id", updateNote /* #swagger.tags = ['Notes'] */);    // <-- edit note endpoint
router.delete("/:id", deleteNote /* #swagger.tags = ['Notes'] */);

export default router;
