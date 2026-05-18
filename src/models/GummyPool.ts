import { Schema, model, Document, Types } from "mongoose";

// -------------------
// Sub-Interface
// -------------------
export interface IGummyPoolEntry {
  clientId: Types.ObjectId;
  storeId: Types.ObjectId;
  storeName: string;
  labelId: Types.ObjectId;
  units: number;
  joinedAt: Date;
}

// -------------------
// Main Interface
// -------------------
export interface IGummyPool extends Document {
  cannabinoidKey: string; // e.g. "CBC-50_CBD-200" — sorted, deterministic
  entries: IGummyPoolEntry[];
  totalUnits: number;
  requiredUnits: number;
  status: "open" | "triggered";
  triggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// -------------------
// Sub-Schema
// -------------------
const GummyPoolEntrySchema = new Schema<IGummyPoolEntry>(
  {
    clientId: { type: Schema.Types.ObjectId, ref: "PrivateLabelClient", required: true },
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    storeName: { type: String, required: true },
    labelId: { type: Schema.Types.ObjectId, ref: "Label", required: true },
    units: { type: Number, required: true, min: 1 },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// -------------------
// Main Schema
// -------------------
const GummyPoolSchema = new Schema<IGummyPool>(
  {
    cannabinoidKey: { type: String, required: true, unique: true },
    entries: { type: [GummyPoolEntrySchema], default: [] },
    totalUnits: { type: Number, default: 0 },
    requiredUnits: { type: Number, default: 3000 },
    status: { type: String, enum: ["open", "triggered"], default: "open" },
    triggeredAt: { type: Date },
  },
  { timestamps: true }
);

// -------------------
// Pre-save Hook: recalculate totalUnits from entries
// -------------------
GummyPoolSchema.pre("save", function (next) {
  this.totalUnits = this.entries.reduce((sum, e) => sum + e.units, 0);
  next();
});

// -------------------
// Indexes
// -------------------
GummyPoolSchema.index({ status: 1 });
GummyPoolSchema.index({ cannabinoidKey: 1 });

// -------------------
// Model Export
// -------------------
export const GummyPool = model<IGummyPool>("GummyPool", GummyPoolSchema);
