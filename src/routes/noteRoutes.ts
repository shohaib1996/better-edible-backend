// src/routes/noteRoutes.ts
import { Router } from "express";
import {
  createNote,
  getAllNotes,
  getNoteById,
  updateNote,
  deleteNote,
} from "../controllers/noteController";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import {
  createNoteSchema,
  updateNoteSchema,
  getAllNotesQuery,
} from "../validators/noteSchemas";

const router = Router();

router.post("/", validate({ body: createNoteSchema }), createNote /* #swagger.tags = ['Notes'] */);
router.get("/", validate({ query: getAllNotesQuery }), getAllNotes /* #swagger.tags = ['Notes'] */);
router.get("/:id", validate({ params: idParam }), getNoteById /* #swagger.tags = ['Notes'] */);
router.put("/:id", validate({ params: idParam, body: updateNoteSchema }), updateNote /* #swagger.tags = ['Notes'] */);    // <-- edit note endpoint
router.delete("/:id", validate({ params: idParam }), deleteNote /* #swagger.tags = ['Notes'] */);

export default router;
