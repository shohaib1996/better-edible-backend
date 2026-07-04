import { Schema, model, Document, Types } from "mongoose";

export interface IPartnerProposal extends Document {
  storeId: Types.ObjectId;
  storeName: string;
  title: string;
  description?: string;
  proposedDiscount: number;
  proposedStartDate: Date;
  proposedEndDate: Date;
  notes?: string;
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
}

const PartnerProposalSchema = new Schema<IPartnerProposal>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    storeName: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    proposedDiscount: { type: Number, required: true, min: 0, max: 100 },
    proposedStartDate: { type: Date, required: true },
    proposedEndDate: { type: Date, required: true },
    notes: String,
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    adminNote: String,
  },
  { timestamps: true }
);

export const PartnerProposal = model<IPartnerProposal>("PartnerProposal", PartnerProposalSchema);
