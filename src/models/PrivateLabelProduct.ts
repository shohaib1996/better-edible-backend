import { Schema, model, Document } from "mongoose";

// ─────────────────────────────
// INTERFACE
// ─────────────────────────────

export interface IPrivateLabelProduct extends Document {
  name: string; // e.g., "BIOMAX", "Rosin", "Delta-8"
  unitPrice: number; // Price per unit/case
  description?: string; // Optional description
  isActive: boolean; // Can be disabled without deleting
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────
// SCHEMA
// ─────────────────────────────

const PrivateLabelProductSchema = new Schema<IPrivateLabelProduct>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for faster queries
PrivateLabelProductSchema.index({ isActive: 1, name: 1 });

// ─────────────────────────────
// EXPORT
// ─────────────────────────────

export const PrivateLabelProduct = model<IPrivateLabelProduct>(
  "PrivateLabelProduct",
  PrivateLabelProductSchema
);
