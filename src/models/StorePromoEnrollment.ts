import { Schema, model, Document, Types } from "mongoose";

export interface IStorePromoEnrollment extends Document {
  promotion: Types.ObjectId;
  store: Types.ObjectId;
  enrolledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StorePromoEnrollmentSchema = new Schema<IStorePromoEnrollment>(
  {
    promotion: { type: Schema.Types.ObjectId, ref: "StorePromotion", required: true },
    store: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    enrolledAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

StorePromoEnrollmentSchema.index({ promotion: 1, store: 1 }, { unique: true });

export const StorePromoEnrollment = model<IStorePromoEnrollment>(
  "StorePromoEnrollment",
  StorePromoEnrollmentSchema
);
