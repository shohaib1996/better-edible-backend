import { Schema, model, Document, Types } from "mongoose";

export interface IPartnerPromoEnrollment extends Document {
  promoId: Types.ObjectId;
  storeId: Types.ObjectId;
  enrolledAt: Date;
}

const PartnerPromoEnrollmentSchema = new Schema<IPartnerPromoEnrollment>(
  {
    promoId: { type: Schema.Types.ObjectId, ref: "PartnerPromotion", required: true },
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    enrolledAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

PartnerPromoEnrollmentSchema.index({ promoId: 1, storeId: 1 }, { unique: true });

export const PartnerPromoEnrollment = model<IPartnerPromoEnrollment>(
  "PartnerPromoEnrollment",
  PartnerPromoEnrollmentSchema
);
