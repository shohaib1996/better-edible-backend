import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPartnershipEnrollment extends Document {
  storeId: Types.ObjectId;
  status: "pending_approval" | "active" | "pending_setup" | "rejected";
  posApiKey?: string;
  posApiConnected: boolean;
  approvedAt?: Date;
  approvedBy?: string;
  requestedAt: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PartnershipEnrollmentSchema = new Schema<IPartnershipEnrollment>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true, unique: true },
    status: {
      type: String,
      enum: ["pending_approval", "active", "pending_setup", "rejected"],
      default: "pending_approval",
    },
    posApiKey: { type: String },
    posApiConnected: { type: Boolean, default: false },
    approvedAt: { type: Date },
    approvedBy: { type: String },
    requestedAt: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

PartnershipEnrollmentSchema.index({ storeId: 1 }, { unique: true });
PartnershipEnrollmentSchema.index({ posApiKey: 1 }, { sparse: true });

export default mongoose.model<IPartnershipEnrollment>(
  "PartnershipEnrollment",
  PartnershipEnrollmentSchema
);
