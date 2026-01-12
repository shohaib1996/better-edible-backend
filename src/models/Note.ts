import { Schema, model, Document, Types } from "mongoose";

export interface INote extends Document {
  entityId: Types.ObjectId;
  author: Types.ObjectId;
  date: string; // Client sends "YYYY-MM-DD HH:MM" from their device (PST timezone, 24hr format)
  disposition?: string;
  visitType?: string;
  content?: string;
  sample?: boolean;
  delivery?: boolean;
  payment?: {
    cash?: boolean;
    check?: boolean;
    noPay?: boolean;
    amount?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    entityId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: "Rep",
      required: true,
    },

    date: {
      type: String,
      required: true,
      // Format: "YYYY-MM-DD HH:MM" (24hr) - Client MUST send from their device
      // Example: "2026-01-12 14:30"
    },

    disposition: { type: String, trim: true },

    visitType: { type: String, trim: true },

    content: { type: String, trim: true },

    // independent flags
    sample: { type: Boolean, default: false },
    delivery: { type: Boolean, default: false },

    // grouped payment options
    payment: {
      cash: { type: Boolean, default: false },
      check: { type: Boolean, default: false },
      noPay: { type: Boolean, default: false },
      amount: { type: String, trim: true },
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

NoteSchema.index({ entityId: 1, date: -1 });

export const Note = model<INote>("Note", NoteSchema);
