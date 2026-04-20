import { Schema, model, Document } from "mongoose";
import type { CannabisType } from "./OilContainer";

// ─────────────────────────────
// TYPES
// ─────────────────────────────

export type WasteReason = "cleaning" | "spillage" | "other";

// ─────────────────────────────
// MAIN INTERFACE
// ─────────────────────────────

export interface IWasteLog extends Document {
  date: Date;
  material: CannabisType;
  amount: number; // grams
  reason: WasteReason;
  sourceContainerId: string; // OilContainer.containerId
  loggedBy: { userId: string; userName: string };
  notes?: string;
  isAutomatic: boolean; // true = triggered by clean action, false = manual entry
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────
// MAIN SCHEMA
// ─────────────────────────────

const WasteLogSchema = new Schema<IWasteLog>(
  {
    date: { type: Date, required: true },
    material: {
      type: String,
      enum: ["BioMax", "Rosin"],
      required: true,
    },
    reason: {
      type: String,
      enum: ["cleaning", "spillage", "other"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    sourceContainerId: { type: String, required: true },
    loggedBy: {
      userId: { type: String, required: true },
      userName: { type: String, required: true },
    },
    notes: { type: String },
    isAutomatic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─────────────────────────────
// INDEXES
// ─────────────────────────────

WasteLogSchema.index({ date: -1 });
WasteLogSchema.index({ sourceContainerId: 1 });
WasteLogSchema.index({ material: 1 });

// ─────────────────────────────
// EXPORT
// ─────────────────────────────

export const WasteLog = model<IWasteLog>("WasteLog", WasteLogSchema);
