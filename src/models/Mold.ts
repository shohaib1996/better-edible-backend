import { Schema, model, Document } from "mongoose";

// ─────────────────────────────
// INTERFACE
// ─────────────────────────────

export interface IMold extends Document {
  moldId: string;
  barcodeValue: string;
  unitsPerMold: number;
  status: "available" | "in-use";
  currentCookItemId: string | null;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────
// SCHEMA
// ─────────────────────────────

const MoldSchema = new Schema<IMold>(
  {
    moldId: { type: String, required: true, unique: true },
    barcodeValue: { type: String, required: true },
    unitsPerMold: { type: Number, default: 104 },
    status: {
      type: String,
      enum: ["available", "in-use"],
      default: "available",
    },
    currentCookItemId: { type: String, default: null },
    lastUsedAt: Date,
  },
  { timestamps: true }
);

// ─────────────────────────────
// INDEXES
// ─────────────────────────────

MoldSchema.index({ moldId: 1 }, { unique: true });
MoldSchema.index({ status: 1 });
MoldSchema.index({ currentCookItemId: 1 });

// ─────────────────────────────
// EXPORT
// ─────────────────────────────

export const Mold = model<IMold>("Mold", MoldSchema);
