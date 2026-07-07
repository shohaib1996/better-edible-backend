import { Schema, model, Document, Types } from "mongoose";

export type ProposalStatus = "pending" | "approved" | "rejected";

export interface IStorePromoProposal extends Document {
  store: Types.ObjectId;
  storeName?: string;
  title: string;
  description?: string;
  proposedDiscount: number;
  proposedStartDate: Date;
  proposedEndDate: Date;
  notes?: string;
  status: ProposalStatus;
  reviewedAt?: Date;
  adminNote?: string;
  createdPromotion?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StorePromoProposalSchema = new Schema<IStorePromoProposal>(
  {
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    storeName: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    proposedDiscount: { type: Number, required: true, min: 1, max: 100 },
    proposedStartDate: { type: Date, required: true },
    proposedEndDate: { type: Date, required: true },
    notes: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedAt: { type: Date },
    adminNote: { type: String },
    createdPromotion: { type: Schema.Types.ObjectId, ref: "StorePromotion" },
  },
  { timestamps: true }
);

export const StorePromoProposal = model<IStorePromoProposal>(
  "StorePromoProposal",
  StorePromoProposalSchema
);
