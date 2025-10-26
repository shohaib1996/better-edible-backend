// src/models/Note.ts
import { Schema, model, Document, Types } from 'mongoose';

export type EntityType = 'Store' | 'Order' | 'Rep';

export interface INote extends Document {
  entityType: EntityType;
  entityId: Types.ObjectId;
  author?: Types.ObjectId; // usually a Rep or Admin
  text: string;
  createdAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    entityType: {
      type: String,
      enum: ['Store', 'Order', 'Rep'],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'Rep' },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// helpful search index
NoteSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const Note = model<INote>('Note', NoteSchema);
