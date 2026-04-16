import { Schema, model, Document } from "mongoose";

// ─────────────────────────────
// TYPES
// ─────────────────────────────

export interface IFlavor extends Document {
  flavorId: string;      // e.g. "FL-001"
  name: string;          // canonical name, e.g. "Watermelon"
  isBlend: boolean;
  blendOf: string[];     // flavorIds of parent flavors (only if isBlend)
  defaultAmount?: number; // grams per mold (optional preset)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────
// SCHEMA
// ─────────────────────────────

const FlavorSchema = new Schema<IFlavor>(
  {
    flavorId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    isBlend: { type: Boolean, default: false },
    blendOf: { type: [String], default: [] },
    defaultAmount: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

FlavorSchema.index({ isActive: 1 });
FlavorSchema.index({ isBlend: 1 });
FlavorSchema.index({ blendOf: 1 });

export const Flavor = model<IFlavor>("Flavor", FlavorSchema);
