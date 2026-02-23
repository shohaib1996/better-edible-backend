import { Schema, model, Document } from "mongoose";

// ─────────────────────────────
// SUB-INTERFACE
// ─────────────────────────────

export interface IShelf {
  occupied: boolean;
  trayId: string | null;
  cookItemId: string | null;
}

// ─────────────────────────────
// MAIN INTERFACE
// ─────────────────────────────

export interface IDehydratorUnit extends Document {
  unitId: string;
  totalShelves: number;
  shelves: Map<string, IShelf>;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────
// SUB-SCHEMA
// ─────────────────────────────

const ShelfSchema = new Schema<IShelf>(
  {
    occupied: { type: Boolean, default: false },
    trayId: { type: String, default: null },
    cookItemId: { type: String, default: null },
  },
  { _id: false }
);

// ─────────────────────────────
// MAIN SCHEMA
// ─────────────────────────────

const DehydratorUnitSchema = new Schema<IDehydratorUnit>(
  {
    unitId: { type: String, required: true, unique: true },
    totalShelves: { type: Number, default: 20 },
    shelves: {
      type: Map,
      of: ShelfSchema,
      default: () => new Map(),
    },
  },
  { timestamps: true }
);

// ─────────────────────────────
// PRE-SAVE HOOK
// ─────────────────────────────

DehydratorUnitSchema.pre("save", function (next) {
  if (this.isNew && (!this.shelves || this.shelves.size === 0)) {
    this.shelves = new Map();
    for (let i = 1; i <= this.totalShelves; i++) {
      this.shelves.set(String(i), { occupied: false, trayId: null, cookItemId: null });
    }
  }
  next();
});

// ─────────────────────────────
// EXPORT
// ─────────────────────────────

export const DehydratorUnit = model<IDehydratorUnit>("DehydratorUnit", DehydratorUnitSchema);
