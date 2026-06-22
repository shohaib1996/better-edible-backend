import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPromotionEnrollment extends Document {
  storeId: Types.ObjectId;
  status: "pending_approval" | "active" | "rejected";
  creditBalance: number;
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionEnrollmentSchema = new Schema<IPromotionEnrollment>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true, unique: true },
    status: {
      type: String,
      enum: ["pending_approval", "active", "rejected"],
      default: "pending_approval",
    },
    creditBalance: { type: Number, default: 0 },
    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    approvedBy: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

PromotionEnrollmentSchema.index({ storeId: 1 }, { unique: true });
PromotionEnrollmentSchema.index({ status: 1 });

export default mongoose.model<IPromotionEnrollment>(
  "PromotionEnrollment",
  PromotionEnrollmentSchema
);
