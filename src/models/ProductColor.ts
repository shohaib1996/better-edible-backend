import { Schema, model, Document } from "mongoose";

// ─────────────────────────────
// TYPES
// ─────────────────────────────

export interface IProductColor extends Document {
  colorId: string; // e.g. "COL-001"
  name: string; // e.g. "Red #40"
  hexPreview?: string; // e.g. "#FF0000" for UI swatch
  defaultAmount?: number; // grams per mold (optional preset)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────
// SCHEMA
// ─────────────────────────────

const ProductColorSchema = new Schema<IProductColor>(
  {
    colorId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    hexPreview: { type: String },
    defaultAmount: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductColorSchema.index({ isActive: 1 });

export const ProductColor = model<IProductColor>("ProductColor", ProductColorSchema);
