import { Schema, model, Document } from "mongoose";

// ─────────────────────────────
// INTERFACE
// ─────────────────────────────

export interface IDehydratorTray extends Document {
  trayId: string;
  qrCodeValue: string;
  status: "available" | "in-use";
  currentCookItemId: string | null;
  currentDehydratorUnitId: string | null;
  currentShelfPosition: number | null;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────
// SCHEMA
// ─────────────────────────────

const DehydratorTraySchema = new Schema<IDehydratorTray>(
  {
    trayId: { type: String, required: true, unique: true },
    qrCodeValue: { type: String, required: true },
    status: {
      type: String,
      enum: ["available", "in-use"],
      default: "available",
    },
    currentCookItemId: { type: String, default: null },
    currentDehydratorUnitId: { type: String, default: null },
    currentShelfPosition: { type: Number, default: null },
    lastUsedAt: Date,
  },
  { timestamps: true }
);

// ─────────────────────────────
// INDEXES
// ─────────────────────────────

DehydratorTraySchema.index({ trayId: 1 }, { unique: true });
DehydratorTraySchema.index({ status: 1 });
DehydratorTraySchema.index({ currentCookItemId: 1 });
DehydratorTraySchema.index({ currentDehydratorUnitId: 1 });

// ─────────────────────────────
// EXPORT
// ─────────────────────────────

export const DehydratorTray = model<IDehydratorTray>("DehydratorTray", DehydratorTraySchema);
