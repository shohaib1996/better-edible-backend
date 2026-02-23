import { Schema, model, Document, Types } from "mongoose";

// ─────────────────────────────
// INTERFACE
// ─────────────────────────────

export interface ICase extends Document {
  caseId: string;
  cookItemId: string;
  orderId: string;
  customerId: Types.ObjectId;
  storeName: string;
  flavor: string;
  productType: string;
  unitCount: number;
  caseNumber: number;
  totalCasesForItem: number;
  labelPrintTimestamp: Date;
  status: "in-inventory" | "shipped";
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────
// SCHEMA
// ─────────────────────────────

const CaseSchema = new Schema<ICase>(
  {
    caseId: { type: String, required: true, unique: true },
    cookItemId: { type: String, required: true },
    orderId: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, required: true },
    storeName: { type: String, required: true },
    flavor: { type: String, required: true },
    productType: { type: String, required: true },
    unitCount: { type: Number, required: true },
    caseNumber: { type: Number, required: true },
    totalCasesForItem: { type: Number, required: true },
    labelPrintTimestamp: { type: Date, required: true },
    status: {
      type: String,
      enum: ["in-inventory", "shipped"],
      default: "in-inventory",
    },
  },
  { timestamps: true }
);

// ─────────────────────────────
// INDEXES
// ─────────────────────────────

CaseSchema.index({ cookItemId: 1 });
CaseSchema.index({ orderId: 1 });
CaseSchema.index({ status: 1 });

// ─────────────────────────────
// EXPORT
// ─────────────────────────────

export const Case = model<ICase>("Case", CaseSchema);
