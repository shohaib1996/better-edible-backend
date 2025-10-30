import { Schema, model, Document, Types } from "mongoose";

export interface INote extends Document {
  entityId: Types.ObjectId; // store id
  author?: Types.ObjectId; // optional, rep/admin
  date: Date;
  disposition?: string;
  visitType?: string;
  notes?: string;
  createdAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    entityId: {
      type: Schema.Types.ObjectId,
      ref: "Store", // since all notes belong to stores now
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "Rep",
    },
    date: { type: Date, required: true, default: Date.now },
    disposition: { type: String, trim: true },
    visitType: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NoteSchema.index({ entityId: 1, date: -1 });

export const Note = model<INote>("Note", NoteSchema);
