import { Schema, model, Document } from "mongoose";

// ─────────────────────────────
// TYPES
// ─────────────────────────────

export type CannabisType = "BioMax" | "Rosin";
export type ContainerStatus = "active" | "empty" | "cleaning";

export interface IContainerHistoryEntry {
  action: "created" | "refilled" | "drawdown" | "cleaned" | "manual_adjustment";
  amount: number; // grams involved in this action
  balanceBefore: number;
  balanceAfter: number;
  performedBy: { userId: string; userName: string };
  note?: string;
  timestamp: Date;
}

// ─────────────────────────────
// MAIN INTERFACE
// ─────────────────────────────

export interface IOilContainer extends Document {
  containerId: string; // e.g. "OIL-001"
  name: string; // display name shown to cook
  cannabisType: CannabisType;
  potency: number; // stored as percentage, e.g. 85 means 85%
  totalAmount: number; // grams at creation
  remainingAmount: number; // decremented on each drawdown
  status: ContainerStatus;
  createdBy: string; // admin userId
  history: IContainerHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────
// SUB-SCHEMA
// ─────────────────────────────

const ContainerHistoryEntrySchema = new Schema<IContainerHistoryEntry>(
  {
    action: {
      type: String,
      enum: ["created", "refilled", "drawdown", "cleaned", "manual_adjustment"],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    performedBy: {
      userId: { type: String, required: true },
      userName: { type: String, required: true },
    },
    note: { type: String },
    timestamp: { type: Date, required: true },
  },
  { _id: false }
);

// ─────────────────────────────
// MAIN SCHEMA
// ─────────────────────────────

const OilContainerSchema = new Schema<IOilContainer>(
  {
    containerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    cannabisType: {
      type: String,
      enum: ["BioMax", "Rosin"],
      required: true,
    },
    potency: { type: Number, required: true, min: 0.1, max: 100 },
    totalAmount: { type: Number, required: true, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["active", "empty", "cleaning"],
      default: "active",
    },
    createdBy: { type: String, required: true },
    history: { type: [ContainerHistoryEntrySchema], default: [] },
  },
  { timestamps: true }
);

// ─────────────────────────────
// INDEXES
// ─────────────────────────────

OilContainerSchema.index({ status: 1 });
OilContainerSchema.index({ cannabisType: 1 });
OilContainerSchema.index({ createdAt: -1 });

// ─────────────────────────────
// EXPORT
// ─────────────────────────────

export const OilContainer = model<IOilContainer>("OilContainer", OilContainerSchema);
